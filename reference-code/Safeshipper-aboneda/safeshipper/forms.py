from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileRequired, FileAllowed
from wtforms import StringField, PasswordField, SubmitField, SelectField
from wtforms.validators import Length, EqualTo, Email, DataRequired, ValidationError, InputRequired
from safeshipper.models import User


class LoginForm(FlaskForm):
    email = StringField(label='Email', validators=[Email(), DataRequired()])
    password = PasswordField(label='Password', validators=[Length(min=4), DataRequired()])
    submit = SubmitField(label='Login')


class UserForm(FlaskForm):
    first_name = StringField(label='First Name', validators=[Length(min=2, max=30), DataRequired()])
    last_name = StringField(label='Last Name', validators=[Length(min=2, max=30), DataRequired()])
    role = SelectField(label='Role', choices=[(1, 'Admin'), (2, 'User')])
    email = StringField(label='Email', validators=[Email(), DataRequired()])
    password = PasswordField('Password', validators=[Length(min=4), DataRequired()])
    password_confirm = PasswordField('Confirm Password',
                                     validators=[InputRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField(label='Submit')

    # def validate_email(self, email_to_check):
    #     email = User.query.filter_by(email=email_to_check.data).first()
    #     if email:
    #         raise ValidationError('Email already exists! Please try a different email address')

    # def validate_attr(self, val):
    #     pass


class SdsForm(FlaskForm):
    material_number = StringField('Material Number', [InputRequired()])
    material_name = StringField('Material Name', [InputRequired()])
    un_number = StringField('UN Name', [Length(min=2, max=30), InputRequired()])
    psn = StringField('Proper Shipping Name', [InputRequired()])
    class_name = StringField('Class', [InputRequired()])
    hazard_label = StringField('Hazard Label', [InputRequired()])
    attachment = FileField('SDS Attachment', validators=[
        FileRequired(),
        FileAllowed(["pdf"], "SDS Attachment is not a valid PDF file !")
    ])
    link = StringField('SDS Link', [InputRequired()])
    submit = SubmitField(label='Submit')


class EpgForm(FlaskForm):
    un_number = StringField('UN Name', [Length(min=2, max=30), InputRequired()])
    attachment = FileField('EPG Attachment', validators=[
        FileRequired(),
        FileAllowed(["pdf"], "EPG Attachment is not a valid PDF file !")
    ])
    submit = SubmitField(label='Submit')
