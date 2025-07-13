import time
import datetime
import gspread
from pypdf import PdfReader
from flask import url_for, redirect, render_template, flash, request, session, jsonify
from flask_login import login_user, logout_user, login_required, current_user

from safeshipper import app
from safeshipper.forms import LoginForm
from safeshipper.models import User, Epg, Sds
from safeshipper.constants import UPLOAD_DIR_PATH, SHEET1_SHEET_NAME, SHEET1_SHEET_URL,\
    EXCLUSION_SHEET_NAME, HAZARD_IMAGE_PATH, CREDENTIAL_FILENAME, SHEET4_SHEET_NAME, SHEET4_SHEET_URL, \
    DG_DOC2_SHEET_NAME, DG_DOC2_SHEET_URL
from safeshipper.utilities import merge_pdf_files, make_pdf_from_raw_html
import os

os.environ['OPENBLAS_NUM_THREADS'] = '1'
import pandas as pd
import numpy as np


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    form = LoginForm()
    if form.validate_on_submit():
        attempted_user = User.query.filter_by(email=form.email.data).first()
        if attempted_user and attempted_user.check_password_correction(attempted_password=form.password.data):
            login_user(attempted_user)
            session.permanent = True
            if request.args.get('next'):
                return redirect(request.args.get('next'))
            return redirect(url_for('dashboard'))
        else:
            flash('Email and password are incorrect! Please try again!', category='danger')
    return render_template('login.html', form=form)


@app.route('/dashboard')
@login_required
def dashboard():
    current_time = datetime.datetime.now()
    hello = 'Good evening'
    if current_time.hour < 12:
        hello = 'Good morning'
    elif 12 <= current_time.hour < 18:
        hello = 'Good afternoon'
    hello = hello + ', ' + current_user.first_name + ' ' + current_user.last_name
    return render_template('dashboard.html', hello=hello)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))


@app.route('/manifest')
@login_required
def manifest():
    return render_template('manifest.html')


@app.route('/manifest2')
@login_required
def manifest2():
    return render_template('manifest2.html')


@app.route('/complete-report')
@login_required
def complete_report():
    return render_template('complete_report.html')


@app.route('/compatibility')
@login_required
def compatibility():
    return render_template('compatibility.html')


@app.route('/epg-report')
@login_required
def epg_report():
    return render_template('epg_report.html')


@app.route('/upload', methods=['POST'])
@login_required
def upload():
    file = request.files['file']
    filename = file.filename
    secure_filename = str(time.time()) + "-" + filename.replace(" ", "-").lower()
    target_file = os.path.join(UPLOAD_DIR_PATH, secure_filename)
    file.save(target_file)
    return target_file

"""
@app.route('/search-manifest', methods=['POST'])
@login_required
def search_manifest():
    target_path = request.json["filename"]
    files = list(set(os.scandir(path=HAZARD_IMAGE_PATH)) - set(['.', '..']))
    image_list = []
    for file in files:
        image_list.append(file.name)
    gc = gspread.service_account(filename=CREDENTIAL_FILENAME)
    sh = gc.open_by_url(SHEET1_SHEET_URL)
    ws = sh.worksheet(SHEET1_SHEET_NAME)
    df = pd.DataFrame(ws.get_all_records())
    exclude_ws = sh.worksheet(EXCLUSION_SHEET_NAME)
    exclude_df = pd.DataFrame(exclude_ws.get_all_records())
    exclude_list = []
    for row in exclude_df.values.tolist():
        exclude_item = row[0]
        exclude_item = exclude_item.strip()
        if exclude_item == "":
            break
        exclude_list.append(exclude_item.lower())

    reader = PdfReader(target_path)
    content = ""
    for page in reader.pages:
        content += page.extract_text() + "\n"

    line_splits = content.split("\n")
    result = []
    words = []
    count = 0
    count_array = []

    for row in df.values.tolist():
        keywords = row[3].split(",")
        keywords = [keyword for keyword in keywords if len(keyword.strip()) > 1]
        for keyword in keywords:
            keyword_lower = keyword.strip().lower()

            check_keyword = False
            keyword_count = 0
            if not keyword.isnumeric():
                for line in line_splits:
                    line_content = line.strip().lower()
                    if keyword_lower in line_content:
                        exclude_flag = False
                        for exclude_item in exclude_list:
                            if exclude_item in line_content:
                                exclude_flag = True
                                break
                        if exclude_flag:
                            continue

                    keyword_positions = [i for i in range(len(line_content)) if
                                         line_content.startswith(keyword_lower, i)]
                    for key_pos in keyword_positions:
                        before_pos = key_pos - 1
                        after_pos = key_pos + len(keyword_lower)

                        before_check = False
                        after_check = False

                        if before_pos < 0:
                            before_check = True
                        else:
                            before_char = line_content[before_pos]
                            if not before_char.isalpha():
                                before_check = True
                        if after_pos >= len(line_content):
                            after_check = True
                        else:
                            after_char = line_content[after_pos]
                            if not after_char.isalpha():
                                after_check = True

                        if before_check and after_check:
                            keyword_count += 1
                            check_keyword = True

            if check_keyword:
                if not keyword.strip() in words:
                    words.append(keyword.strip())
                    result.append(row)
                    count += keyword_count
                    count_array.append(keyword_count)
                break
    return jsonify([result, words, count_array, count, image_list, target_path])
"""


##################
## utils
##################
from langchain.document_loaders import PyPDFLoader, UnstructuredPDFLoader, PDFMinerLoader, PyMuPDFLoader
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
import io 
import re

def pdfparser1(data):

    fp = open(data, 'rb')
    rsrcmgr = PDFResourceManager()
    retstr = io.StringIO()
    #codec = 'utf-8'
    laparams = LAParams()
    #device = TextConverter(rsrcmgr, retstr, codec=codec, laparams=laparams)
    device = TextConverter(rsrcmgr, retstr, laparams=laparams)
    # Create a PDF interpreter object.
    interpreter = PDFPageInterpreter(rsrcmgr, device)
    # Process each page contained in the document.

    result = []
    page_no = 0
    for pageNumber, page in enumerate( PDFPage.get_pages(fp) ):
        if pageNumber == page_no:
            interpreter.process_page(page)
            data =  retstr.getvalue() 
            result.append(data)
            retstr.truncate(0)
            retstr.seek(0)

        page_no += 1
    return "\n".join(result)


def pdfparser2(file_path):
    """ a function to load text content from pdf file """
    data = []
    try:
        loader = PyPDFLoader(file_path)
        data = loader.load_and_split()
    except Exception as e:
        print(e)
        try:
            loader = UnstructuredPDFLoader(file_path)
            data = loader.load()
            print("Data loaded successfully")
        except Exception as e:
            print(e)
            try:
                loader = PDFMinerLoader(file_path)
                data = loader.load()
            except Exception as e:
                print(e)
                try:
                    loader = PyMuPDFLoader(file_path)
                    data = loader.load()
                except Exception as e:
                    print(e)
                    print("Failed to load the given pdf file.")
    return data



def generate_pattern(word):
    pattern_letters = [f"[{letter.upper()}{letter.lower()}]" for letter in word]
    pattern = r'\b(?:{}\S*|{}{}\S*)\b'.format(''.join(pattern_letters),  r'.{0,}', ''.join(pattern_letters))
    return pattern

def check_word(sentence, pattern):
    matches = re.findall(pattern, sentence)
    return matches

################
## Method2
################

@app.route('/search-manifest', methods = ['POST'])
def search_manifest():
    target_path = request.json["filename"]
    imagePath = 'static/images/Hazard_labels'
    # files = list(set(os.scandir(path=imagePath)) - set(['.', '..']))
    files = list(set(os.scandir(path=HAZARD_IMAGE_PATH)) - set(['.', '..']))
    imageLists = []
    for file in files:
        imageLists.append(file.name)
    gc = gspread.service_account(filename='credentials.json')
    sh = gc.open_by_url('https://docs.google.com/spreadsheets/d/1fLzXr4Yw7WCQr4YQ_vM0UmYn17gXA05Yl94XlrEdPRk/edit#gid=0')
    ws = sh.worksheet('Sheet1')
    df = pd.DataFrame(ws.get_all_records())
    # raw = parser.from_file('static' + target_path[1::])
    exclude_ws = sh.worksheet('Exclusion')
    exclude_df = pd.DataFrame(exclude_ws.get_all_records())
    exclude_list = []
    for row in exclude_df.values.tolist():
        exclude_item = row[0]
        exclude_item = exclude_item.strip()
        if exclude_item == "":
            break
        exclude_list.append(exclude_item.lower())
    
    content = pdfparser1(target_path)
    line_splits = [x for x in content.split("\n") if x]

    # line_splits = []
    # for doc in content:
    #     res =  doc.page_content.split("\n")
    #     for r in res:
    #         line_splits += r.split(",")

    result = []
    words = []
    count = 0
    countArray = []

    for row in list(df.values.tolist()):

        # 0- getting row keywords
        keywords = row[3].split(",")
        keywords = [keyword for keyword in keywords if len(keyword.strip()) > 1]
        
        # 1- Loop over each keyword
        for keyword in list(set(keywords)):
            keyword_lower = keyword.strip().lower()
            keywordCount = 0

            # 2- Skip the keyword if it is already in the words list
            if keyword.strip() in words:
                continue
            
            if not keyword.isnumeric():

                # 3- Loop over all lines
                for line in line_splits:

                    # 4- skip the line if it includes an exclude item
                    if keyword_lower in line.strip().lower():
                        exclude_flag = any(exclude_item in line.strip().lower() for exclude_item in exclude_list)
                        if exclude_flag:
                            continue
                    else:
                        continue

                    # Check if the all word letters are capital or 
                    # starts with a capital letter and ends with none or a new capital

                    pattern = r'(?<!\w)(?:[A-Z]+|[A-Z][a-zA-Z]*[A-Z]?)\b'
                    matches = re.findall(pattern, line)

                    # pattern = generate_pattern(keyword_lower)
                    # matches = check_word(line, pattern)

                    keywordCount = len(matches)

                    
                    if 'filter' in line.strip().lower():
                        keywordCount += 1

            if keywordCount: 
                if not keyword_lower in words:
                    # print(f"Row: {row}")
                    words.append(keyword_lower)
                    result.append(row)
                    count += keywordCount
                    countArray.append(keywordCount)
    # print(words)
    return jsonify([result, words, countArray, count, imageLists,target_path])

##################
## Method2
##################
@app.route('/search-manifest2', methods = ['POST'])
def search_manifest2():
    target_path = request.json["filename"]
    imagePath = 'static/images/Hazard_labels'
    # files = list(set(os.scandir(path=imagePath)) - set(['.', '..']))
    files = list(set(os.scandir(path=HAZARD_IMAGE_PATH)) - set(['.', '..']))
    imageLists = []
    for file in files:
        imageLists.append(file.name)
    gc = gspread.service_account(filename='credentials.json')
    sh = gc.open_by_url('https://docs.google.com/spreadsheets/d/1fLzXr4Yw7WCQr4YQ_vM0UmYn17gXA05Yl94XlrEdPRk/edit#gid=0')
    ws = sh.worksheet('Sheet1')
    df = pd.DataFrame(ws.get_all_records())
    # raw = parser.from_file('static' + target_path[1::])
    exclude_ws = sh.worksheet('Exclusion')
    exclude_df = pd.DataFrame(exclude_ws.get_all_records())
    exclude_list = []
    for row in exclude_df.values.tolist():
        exclude_item = row[0]
        exclude_item = exclude_item.strip()
        if exclude_item == "":
            break
        exclude_list.append(exclude_item.lower())
    
    content = pdfparser1(target_path)
    line_splits = [x for x in content.split("\n") if x]

    result = []
    words = []
    count = 0
    countArray = []


    for row in df.values.tolist():


        # 0- getting row keywords
        keywords = row[3].split(",")
        keywords = [keyword.strip().lower() for keyword in keywords if len(keyword.strip()) > 1]
        
        # 1- Loop over each keyword
        for keyword in keywords:
            keyword_lower = keyword.strip().lower()

            keywordCount = 0

            # 2- Skip the keyword if it is already in the words list
            if keyword.strip() in words:
                continue

            if not keyword.isnumeric():

                # 3- Loop over all lines
                for line in line_splits:

                    # 4- skip the line if it includes an exclude item
                    if keyword_lower in line.strip().lower():
                        exclude_flag = any(exclude_item in line.strip().lower() for exclude_item in exclude_list)
                        if exclude_flag:
                            continue
                    else:
                        continue

                    pattern = r'\b(?:[A-Z][A-Z]*(?![a-z])|[A-Z]+)\b'
                    matches = re.findall(pattern, line)
                    keywordCount = len(matches)

                    if keyword_lower == 'substances':
                        print(f"line: {line}, \n matches: {matches}")

            if keywordCount and not (keyword_lower in words) :
                result.append(row)
                count += keywordCount
                countArray.append(keywordCount)

    return jsonify([result, words, countArray, count, imageLists,target_path])



@app.route('/search-compatibility', methods=['POST'])
@login_required
def search_compatibility():
    target_path = request.json["filename"]
    gc = gspread.service_account(filename=CREDENTIAL_FILENAME)
    sh1 = gc.open_by_url(SHEET1_SHEET_URL)
    ws1 = sh1.worksheet(SHEET1_SHEET_NAME)
    df1 = pd.DataFrame(ws1.get_all_values())
    sh4 = gc.open_by_url(SHEET4_SHEET_URL)
    ws4 = sh4.worksheet(SHEET4_SHEET_NAME)
    df4 = pd.DataFrame(ws4.get_all_values())

    content = ""
    reader = PdfReader(target_path)
    for page in reader.pages:
        content += page.extract_text(0) + "\n"

    result = []
    un_numbers = []
    classes = []
    for row in df1.values.tolist():
        un_number = row[1]
        if str(un_number) in content.lower():
            compat_added = False
            for compat in df4.values.tolist():
                real_class = str(row[4]).split(" ", 1)
                if str(real_class[0]) == compat[0].strip():
                    row.append(compat[1].strip())
                    row.append(compat[2].strip())
                    compat_added = True
                    break
            if not compat_added:
                row.append("")
                row.append("")
            result.append(row)
            classes.append(str(row[4]))
            un_numbers.append(un_number)
    classes = np.array(classes)
    _, idx = np.unique(classes, return_index=True)
    classes = classes[np.sort(idx)].tolist()
    return jsonify([result, un_numbers, classes, target_path])


@app.route('/search-epg-report', methods=['POST'])
@login_required
def search_epg_report():
    target_path = request.json["filename"]
    gc = gspread.service_account(filename=CREDENTIAL_FILENAME)
    sh1 = gc.open_by_url(SHEET1_SHEET_URL)
    ws1 = sh1.worksheet(SHEET1_SHEET_NAME)
    df1 = pd.DataFrame(ws1.get_all_values())

    content = ""
    reader = PdfReader(target_path)
    for page in reader.pages:
        content += page.extract_text(0) + "\n"

    result = []
    for row in df1.values.tolist():
        un_number = row[1]
        if str(un_number) in content.lower():
            result.append(row)
    return jsonify([result, target_path])


@app.route("/generate-pdf", methods=['POST'])
@login_required
def generate_pdf():
    add_summary = request.json["add_summary"]
    add_compatibility = request.json["add_compatibility"]
    add_epg = request.json["add_epg"]
    add_sds = request.json["add_sds"]
    un_number_list = request.json["un_number_list"]

    pdf_file_list = []
    populate_sds_googlesheet(un_number_list)

    summary_compatibility_pdf_url = generate_summary_compatibility_pdf(add_summary, add_compatibility)
    if summary_compatibility_pdf_url:
        pdf_file_list.append(summary_compatibility_pdf_url)

    hazard_pdf_url = generate_hazard_pdf()
    if hazard_pdf_url:
        pdf_file_list.append(hazard_pdf_url)

    pdf_file_list.extend(get_epg_sds_pdf_names(un_number_list, add_epg, add_sds))

    merged_file_path = None
    if len(pdf_file_list):
        merged_file_path = merge_pdf_files(pdf_file_list)

    return jsonify({"url": merged_file_path})


@app.route("/compile-epg-guides", methods=['POST'])
@login_required
def compile_epg_pdf():
    un_number_list = request.json["un_number_list"]
    merged_file_path = None

    pdf_file_list = []

    epgs = Epg.query.filter(Epg.un_number.in_(un_number_list)).all()
    for epg in epgs:
        if epg.attachment not in pdf_file_list:
            if os.path.exists(epg.attachment):
                pdf_file_list.append(request.host_url + epg.attachment)

    if len(pdf_file_list):
        merged_file_path = merge_pdf_files(pdf_file_list)

    return jsonify({"url": merged_file_path})


def generate_summary_compatibility_pdf(add_summary=False, add_compat=False):
    if not add_summary and not add_compat:
        return None

    html = '<!DOCTYPE html><html><head>'
    # html += '<link rel="stylesheet" media="all" href="' + 'https://safeshipper.com.au/safeshipper/static/css/argon-dashboard.css">'
    # html += '<link rel="stylesheet" media="all" href="' + 'https://safeshipper.com.au/safeshipper/static/custom.css"></head><body>'
    html += '<link rel="stylesheet" media="all" href="' + request.host_url + 'safeshipper/static/css/argon-dashboard.css">'
    html += '<link rel="stylesheet" media="all" href="' + request.host_url + 'safeshipper/static/custom.css"></head><body>'

    if add_summary:
        html += '<h2 class="mb-4">Summary Section: Pages searched, results found</h2>'

    if add_compat:
        result, un_numbers, classes = search_compatibility_by_sheet()

        search_tbody_str = ""
        for i in range(len(result)):
            compatible_str = ""
            compatibilities = result[i][11].split(", ")
            incompatibilities = result[i][12].split(", ")

            for class_item in classes:
                compatible_class = class_item.replace("123", "")

                if compatible_class in compatibilities:
                    compatible_str += "<span><div class=\"green circle\"></div></span>"
                elif compatible_class in incompatibilities:
                    compatible_str += "<span><div class=\"red circle\"></div></span>"
                else:
                    compatible_str += "<span></span>"

            search_tbody_str += "<tr><td>" + str(i + 1) + "</td><td>" + result[i][1] + "</td>"
            search_tbody_str += "<td>" + result[i][2] + "</td><td>"
            search_tbody_str += result[i][3] + "</td>" + "<td class=\"compatibility\"><div>"
            search_tbody_str += compatible_str + "</div></td></tr>"

        th_compatibility = "<div>"
        for class_item in classes:
            th_compatibility += "<span>" + class_item + "</span>"
        th_compatibility += "</div>"

        html += '<h4 class="mb-4">COMPATABILITY:COMPATIBLE/ NOT COMPATIBLE</h4>'

        html += '<table class="table table-bordered table-striped">'
        html += '<thead><th>No</th><th>Un Number</th><th>Proper Shipping Name</th><th>Class</th>'
        html += '<th class="compatibility">' + th_compatibility + '</th></thead><tbody>'
        html += search_tbody_str + '</tbody></table>'

    html += '</body></html>'
    return make_pdf_from_raw_html(html)


def generate_hazard_pdf():
    gc = gspread.service_account(filename=CREDENTIAL_FILENAME)
    sh_dg_doc2 = gc.open_by_url(DG_DOC2_SHEET_URL)
    ws_dg_doc2 = sh_dg_doc2.worksheet(DG_DOC2_SHEET_NAME)
    df_dg_doc2 = pd.DataFrame(ws_dg_doc2.get_all_values())

    table_html = '<table class="table-bordered">'
    for row in df_dg_doc2.values.tolist():
        table_html += '<tr>'
        for item in row:
            table_html += '<td>' + item + '</td>'
        table_html += '</tr>'
    table_html += '</table>'

    html = '<!DOCTYPE html><html><head>'
    # html += '<link rel="stylesheet" media="all" href="' + 'https://safeshipper.com.au/safeshipper/static/css/argon-dashboard.css">'
    # html += '<link rel="stylesheet" media="all" href="' + 'https://safeshipper.com.au/safeshipper/static/custom.css"></head><body>'
    html += '<link rel="stylesheet" media="all" href="' + request.host_url + 'safeshipper/static/css/argon-dashboard.css">'
    html += '<link rel="stylesheet" media="all" href="' + request.host_url + 'safeshipper/static/custom.css"></head><body>'
    html += table_html
    html += '</body></html>'

    options = {
        'landscape': True
    }
    return make_pdf_from_raw_html(html, options)


def populate_sds_googlesheet(un_number_list):
    gc = gspread.service_account(filename=CREDENTIAL_FILENAME)
    sh1 = gc.open_by_url(SHEET1_SHEET_URL)
    ws1 = sh1.worksheet(SHEET1_SHEET_NAME)
    df1 = pd.DataFrame(ws1.get_all_values())

    sh_dg_doc2 = gc.open_by_url(DG_DOC2_SHEET_URL)
    ws_dg_doc2 = sh_dg_doc2.worksheet(DG_DOC2_SHEET_NAME)
    ws_dg_doc2.clear()

    counter = 1
    number_list = ['No']
    new_un_list = ['UN Number']
    psn_list = ['Proper Shipping Name']
    class_list = ['Class']
    hazard_list = ['Hazard Label']
    sub_risk_1_list = ['Sub Risk']
    sub_risk_2_list = ['Sub Risk 2']
    packing_group_list = ['Packing Group']
    type_container_list = ['Type of Container']
    quantity_list = ['Quantity']
    handling_unit_list = ['Handling Unit']
    added_un_list = []

    for row in df1.values.tolist():
        try:
            un_number = int(row[1])
            if un_number in un_number_list:
                if not un_number in added_un_list:
                    number_list.append(counter)
                    new_un_list.append(row[1])
                    psn_list.append(row[2])
                    class_list.append(row[4])
                    hazard_list.append(row[5])
                    sub_risk_1_list.append(None)
                    sub_risk_2_list.append(None)
                    packing_group_list.append(None)
                    type_container_list.append(None)
                    quantity_list.append(None)
                    handling_unit_list.append(None)

                    counter += 1
                    added_un_list.append(un_number)
        except:
            continue

    new_df = pd.DataFrame({
        'No': number_list,
        'UN Number': new_un_list,
        'Proper Shipping Name': psn_list,
        'Class': class_list,
        'Sub Risk': sub_risk_1_list,
        'Sub Risk 2': sub_risk_2_list,
        'Hazard Label': hazard_list,
        'Packing Group': packing_group_list,
        'Type of Container': type_container_list,
        'Quantity': quantity_list,
        'Handling Unit': handling_unit_list
    })
    new_df_values = new_df.values.tolist()
    sh_dg_doc2.values_append(DG_DOC2_SHEET_NAME, {'valueInputOption': 'RAW'}, {'values': new_df_values})


def get_epg_sds_pdf_names(un_number_list, add_epg=False, add_sds=False):
    if len(un_number_list) == 0:
        return []

    pdf_name_list = []

    if add_epg:
        epgs = Epg.query.filter(Epg.un_number.in_(un_number_list)).all()
        for epg in epgs:
            if os.path.exists(epg.attachment):
                pdf_name_list.append(request.host_url + epg.attachment)

    if add_sds:
        sdss = Sds.query.filter(Sds.un_number.in_(un_number_list)).all()
        for sds in sdss:
            if os.path.exists(sds.attachment):
                pdf_name_list.append(request.host_url + sds.attachment)

    return pdf_name_list


def search_compatibility_by_sheet():
    gc = gspread.service_account(filename=CREDENTIAL_FILENAME)
    sh_dg_doc2 = gc.open_by_url(DG_DOC2_SHEET_URL)
    ws_dg_doc2 = sh_dg_doc2.worksheet(DG_DOC2_SHEET_NAME)
    df_dg_doc2 = pd.DataFrame(ws_dg_doc2.get_all_values())

    sh4 = gc.open_by_url(SHEET4_SHEET_URL)
    ws4 = sh4.worksheet(SHEET4_SHEET_NAME)
    df4 = pd.DataFrame(ws4.get_all_values())

    result = []
    un_numbers = []
    classes = []

    for row in df_dg_doc2.values.tolist():
        un_number = row[1]
        if "UN Number" in un_number:
            continue

        for compat in df4.values.tolist():
            real_class = str(row[3]).split(" ", 1)
            if str(real_class[0]) == compat[0].strip():
                row.append(compat[1].strip())
                row.append(compat[2].strip())
                break
        if len(row) == 11:
            row.append("")
            row.append("")
        result.append(row)
        classes.append(str(row[3]))
        un_numbers.append(un_number)

    classes = np.array(classes)
    _, idx = np.unique(classes, return_index=True)
    classes = classes[np.sort(idx)].tolist()
    return result, un_numbers, classes