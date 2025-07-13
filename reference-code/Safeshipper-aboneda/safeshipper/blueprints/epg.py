import os
import time
from flask import Blueprint, render_template, jsonify, redirect, url_for, request, flash
from flask_login import login_required
from safeshipper import db
from safeshipper.models import Epg
from safeshipper.forms import EpgForm
from safeshipper.constants import EPG_DIR_PATH

blueprint = Blueprint('epg', __name__)


@blueprint.route('/')
@login_required
def index():
    epgs = Epg.query.all()
    return render_template('epg/index.html', epgs=epgs)


@blueprint.route('/add', methods=['GET', 'POST'])
@login_required
def add():
    form = EpgForm()
    if form.validate_on_submit():
        file = form.attachment.data
        filename = file.filename
        secure_filename = str(time.time()) + "-" + filename.replace(" ", "-").lower()
        target_file = os.path.join(EPG_DIR_PATH, secure_filename)
        file.save(target_file)

        epg = Epg(
            un_number=form.un_number.data,
            attachment=target_file,
        )
        db.session.add(epg)
        db.session.commit()
        return redirect(url_for('epg.index'))
    else:
        for error_message in form.errors.values():
            flash(error_message[0])

    return render_template('epg/add.html', form=form)


@blueprint.route('/<epg_id>/edit', methods=['GET', 'POST'])
@login_required
def edit(epg_id):
    epg = Epg.query.get_or_404(epg_id)
    if request.method == 'GET':
        form = EpgForm(obj=epg)
    else:
        form = EpgForm()
        if form.validate_on_submit():
            old_attachment = epg.attachment
            if os.path.exists(old_attachment):
                os.remove(old_attachment)

            file = form.attachment.data
            filename = file.filename
            secure_filename = str(time.time()) + "-" + filename.replace(" ", "-").lower()
            target_file = os.path.join(EPG_DIR_PATH, secure_filename)
            file.save(target_file)

            epg.un_number = form.un_number.data
            epg.attachment = target_file

            db.session.add(epg)
            db.session.commit()
            return redirect(url_for('epg.index'))
        else:
            for error_messages in form.errors.values():
                flash(error_messages[0])

    return render_template('epg/edit.html', form=form)


@blueprint.route('/<epg_id>/delete', methods=['GET', 'POST'])
@login_required
def delete(epg_id):
    epg = Epg.query.get_or_404(epg_id)
    if request.method == 'POST':
        attachment = epg.attachment
        if os.path.exists(attachment):
            os.remove(attachment)

        db.session.delete(epg)
        db.session.commit()
        return redirect(url_for('epg.index'))

    return render_template('epg/delete.html', epg=epg)
