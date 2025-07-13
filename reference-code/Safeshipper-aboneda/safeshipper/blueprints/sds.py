import os
import time
from flask import Blueprint, render_template, jsonify, redirect, url_for, request, flash
from flask_login import login_required
from safeshipper import db
from safeshipper.models import Sds
from safeshipper.forms import SdsForm
from safeshipper.constants import SDS_DIR_PATH

blueprint = Blueprint('sds', __name__)


@blueprint.route('/')
@login_required
def index():
    sdss = Sds.query.all()
    return render_template('sds/index.html', sdss=sdss)


@blueprint.route('/search-by-un-number/<un_number>')
@login_required
def search_by_un_number(un_number):
    sds = Sds.query.filter_by(un_number=un_number).first()
    if not sds:
        return jsonify({"result": None})
    return jsonify(result=sds.serialize)


@blueprint.route('/add', methods=['GET', 'POST'])
@login_required
def add():
    form = SdsForm()
    if form.validate_on_submit():
        file = form.attachment.data
        filename = file.filename
        secure_filename = str(time.time()) + "-" + filename.replace(" ", "-").lower()
        target_file = os.path.join(SDS_DIR_PATH, secure_filename)
        file.save(target_file)

        sds = Sds(
            material_number=form.material_number.data,
            material_name=form.material_name.data,
            un_number=form.un_number.data,
            psn=form.psn.data,
            class_name=form.class_name.data,
            hazard_label=form.hazard_label.data,
            attachment=target_file,
            link=form.link.data
        )
        db.session.add(sds)
        db.session.commit()
        return redirect(url_for('sds.index'))

    if form.errors != {}:
        for error_message in form.errors.values():
            flash(error_message[0])

    return render_template('sds/add.html', form=form)


@blueprint.route('/<sds_id>/edit', methods=['GET', 'POST'])
@login_required
def edit(sds_id):
    sds = Sds.query.get(sds_id)
    if not sds:
        return render_template('errors/404.html')

    if request.method == 'GET':
        form = SdsForm(obj=sds)
    else:
        form = SdsForm()
        if form.validate_on_submit():
            old_attachment = sds.attachment
            if os.path.exists(old_attachment):
                os.remove(old_attachment)

            file = form.attachment.data
            filename = file.filename
            secure_filename = str(time.time()) + "-" + filename.replace(" ", "-").lower()
            target_file = os.path.join(SDS_DIR_PATH, secure_filename)
            file.save(target_file)

            sds.material_number = form.material_number.data
            sds.material_name = form.material_name.data
            sds.un_number = form.un_number.data
            sds.psn = form.psn.data
            sds.class_name = form.class_name.data
            sds.hazard_label = form.hazard_label.data
            sds.attachment = target_file
            sds.link = form.link.data

            db.session.add(sds)
            db.session.commit()
            return redirect(url_for('sds.index'))
        else:
            for error_messages in form.errors.values():
                flash(error_messages[0])

    return render_template('sds/edit.html', form=form)


@blueprint.route('/<sds_id>/delete', methods=['GET', 'POST'])
@login_required
def delete(sds_id):
    sds = Sds.query.get_or_404(sds_id)
    if request.method == 'POST':
        attachment = sds.attachment
        if os.path.exists(attachment):
            os.remove(attachment)

        db.session.delete(sds)
        db.session.commit()
        return redirect(url_for('sds.index'))

    return render_template('sds/delete.html', sds=sds)
