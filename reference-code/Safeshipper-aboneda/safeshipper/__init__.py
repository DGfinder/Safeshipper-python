from datetime import timedelta
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager

app = Flask(__name__, static_url_path='/safeshipper/static', static_folder='static')

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql://dgfinder_user:dgfinder123!@localhost/dgfinder_db'
# app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:aboneda@localhost:3306/aboneda_db'
app.config['SECRET_KEY'] = 'd28d15e670ac11eba6672b55'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=60)

db = SQLAlchemy()
db.init_app(app)

bcrypt = Bcrypt(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'

from safeshipper.blueprints.user import blueprint as user
from safeshipper.blueprints.sds import blueprint as sds
from safeshipper.blueprints.epg import blueprint as epg
from safeshipper.models import User
# application = app

app.register_blueprint(user, url_prefix='/user')
app.register_blueprint(sds, url_prefix='/sds')
app.register_blueprint(epg, url_prefix='/epgs')

from safeshipper import routes



"""
safeshipper

app.py

application


logs/safeshipper.log


"""