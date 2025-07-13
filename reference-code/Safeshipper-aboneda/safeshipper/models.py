from flask_login import UserMixin
from safeshipper import db, bcrypt, login_manager


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class User(db.Model, UserMixin):
    id = db.Column(db.Integer(), primary_key=True)
    first_name = db.Column(db.String(length=45), nullable=False)
    last_name = db.Column(db.String(length=45), nullable=False)
    email = db.Column(db.String(length=45), nullable=False, unique=True)
    password = db.Column(db.String(length=64), nullable=False)
    role = db.Column(db.Integer(), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), server_onupdate=db.func.now())
    # items = db.relationship('Item', backref='owned_user', lazy=True)

    @property
    def user_role(self):
        return "Admin" if self.role == 1 else "User"

    # @hybrid_property
    # def password(self):
    #     return self._password_hash
    #
    # @password.setter
    # def set_password(self, password):
    #     self._password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password_correction(self, attempted_password):
        return bcrypt.check_password_hash(self.password, attempted_password)

    def __repr__(self):
        return f'User {self.first_name} {self.last_name}'


# class Item(db.Model):
#     id = db.Column(db.Integer(), primary_key=True)
#     owner = db.Column(db.Integer(), db.ForeignKey('user.id'))


class Sds(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    un_number = db.Column(db.String(length=10), nullable=False)
    psn = db.Column(db.String(length=50), nullable=False)
    hazard_label = db.Column(db.String(length=50), nullable=False)
    attachment = db.Column(db.String(length=250), nullable=False)
    link = db.Column(db.String(length=50), nullable=False)
    material_number = db.Column(db.String(length=50), nullable=False)
    material_name = db.Column(db.String(length=50), nullable=False)
    class_name = db.Column(db.String(length=10), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), server_onupdate=db.func.now())

    @property
    def serialize(self):
        return {
            'material_number': self.material_number,
            'material_name': self.material_name,
            'link': self.link
        }


class Epg(db.Model):
    id = db.Column(db.Integer(), primary_key=True)
    un_number = db.Column(db.String(length=10), nullable=False)
    attachment = db.Column(db.String(length=250), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), server_onupdate=db.func.now())
