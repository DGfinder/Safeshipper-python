import os.path
import uuid
from io import BytesIO, SEEK_SET, SEEK_END
import requests
import PyPDF2
from api2pdf import Api2Pdf
from safeshipper.constants import OUTPUT_DIR_PATH, USERAGENT, API2PDF_API_KEY


# Create a class which convert PDF in BytesIO form
class ResponseStream(object):
    def __init__(self, request_iterator):
        self._bytes = BytesIO()
        self._iterator = request_iterator

    def _load_all(self):
        self._bytes.seek(0, SEEK_END)

        for chunk in self._iterator:
            self._bytes.write(chunk)

    def _load_until(self, goal_position):
        current_position = self._bytes.seek(0, SEEK_END)

        while current_position < goal_position:
            try:
                current_position = self._bytes.write(next(self._iterator))

            except StopIteration:
                break

    def tell(self):
        return self._bytes.tell()

    def read(self, size=None):
        left_off_at = self._bytes.tell()

        if size is None:
            self._load_all()
        else:
            goal_position = left_off_at + size
            self._load_until(goal_position)

        self._bytes.seek(left_off_at)

        return self._bytes.read(size)

    def seek(self, position, whence=SEEK_SET):

        if whence == SEEK_END:
            self._load_all()
        else:
            self._bytes.seek(position, whence)


def make_pdf_from_url(url, options=None):
    a2p_client = Api2Pdf(API2PDF_API_KEY)
    api_response = a2p_client.HeadlessChrome.convert_from_url(url, options=options)
    if api_response['success']:
        download_response = requests.get(api_response['pdf'], headers=USERAGENT)
        data = download_response.content
        return data
    else:
        return None


def make_pdf_from_raw_html(html, options={'landscape': False}):
    a2p_client = Api2Pdf(API2PDF_API_KEY)
    api_response = a2p_client.HeadlessChrome.convert_from_html(html, **options)
    result = api_response.result

    if result["success"]:
        return result["pdf"]

    return None


def merge_pdf_files(url_list):
    target_filename = str(uuid.uuid4()) + '.pdf'
    target_pdf_path = os.path.join(OUTPUT_DIR_PATH, target_filename)
    pdf_writer = PyPDF2.PdfWriter()

    for url in url_list:
        secure_url = url.replace('\\', '/')
        response = requests.get(secure_url)
        reader = PyPDF2.PdfReader(ResponseStream(response.iter_content(64)))

        for page in range(len(reader.pages)):
            pdf_writer.add_page(reader.pages[page])

    with open(target_pdf_path, 'wb') as g:
        pdf_writer.write(g)

    return target_pdf_path
