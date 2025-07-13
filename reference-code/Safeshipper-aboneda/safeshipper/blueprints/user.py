from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required
from safeshipper import db, bcrypt
from safeshipper.models import User
from safeshipper.forms import UserForm

blueprint = Blueprint('user', __name__)


@blueprint.route('/')
@login_required
def index():
    users = User.query.all()
    return render_template('user/index.html', users=users)


@blueprint.route('/add', methods=['GET', 'POST'])
@login_required
def add():
    form = UserForm()
    if form.validate_on_submit():
        email = User.query.filter_by(email=form.email.data).first()
        if email:
            flash('Email already exists! Please try a different email address')
        else:
            user = User(
                first_name=form.first_name.data,
                last_name=form.last_name.data,
                email=form.email.data,
                password=bcrypt.generate_password_hash(form.password.data).decode('utf-8'),
                role=form.role.data
            )
            db.session.add(user)
            db.session.commit()
            return redirect(url_for('user.index'))
    else:
        for error_messages in form.errors.values():
            flash(error_messages[0])

    return render_template('user/add.html', form=form)


@blueprint.route('/<user_id>/edit', methods=['GET', 'POST'])
@login_required
def edit(user_id):
    user = User.query.get(user_id)
    if not user:
        return redirect('errors/404.html')

    if request.method == 'GET':
        form = UserForm(obj=user)
    else:
        form = UserForm()
        if form.validate_on_submit():
            user.first_name = form.first_name.data
            user.last_name = form.last_name.data
            user.role = form.role.data
            user.password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')

            if user.email != form.email.data:
                email = User.query.filter_by(email=form.email.data).first()
                if email:
                    flash('Email already exists! Please try a different email address')
                    return render_template('user/edit.html', form=form)
                else:
                    user.email = form.email.data

            db.session.add(user)
            db.session.commit()
            return redirect(url_for('user.index'))
        else:
            for error_messages in form.errors.values():
                flash(error_messages[0])

    return render_template('user/edit.html', form=form)


@blueprint.route('/<user_id>/delete', methods=['GET', 'POST'])
@login_required
def delete(user_id):
    user = User.query.get_or_404(user_id)
    if request.method == 'POST':
        db.session.delete(user)
        db.session.commit()
        return redirect(url_for('user.index'))

    return render_template('user/delete.html', user=user)
