from flask import Flask, redirect, url_for
from flask_dance.contrib.google import make_google_blueprint, google
from flask_login import LoginManager, UserMixin, login_required, login_user, logout_user
from flask_sqlalchemy import SQLAlchemy
import stripe

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/test.db'

db = SQLAlchemy(app)
login_manager = LoginManager(app)

google_blueprint = make_google_blueprint(
    client_id="your-google-client-id",
    client_secret="your-google-client-secret",
    scope=["profile", "email"]
)
app.register_blueprint(google_blueprint, url_prefix="/login")

stripe_keys = {
  'secret_key': 'your-stripe-secret-key',
  'publishable_key': 'your-stripe-publishable-key'
}

stripe.api_key = stripe_keys['secret_key']

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(256), unique=True)
    email = db.Column(db.String(256), unique=True)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route("/")
def index():
    if not google.authorized:
        return redirect(url_for("google.login"))
    resp = google.get("/oauth2/v1/userinfo")
    assert resp.ok, resp.text
    email = resp.json()["email"]
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(username=email, email=email)
        db.session.add(user)
        db.session.commit()
    login_user(user)
    return "You are {email} on Google".format(email=email)

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route("/charge", methods=['POST'])
@login_required
def charge():
    customer = stripe.Customer.create(
        email='customer@example.com',
        source='stripeToken'
    )

    charge = stripe.Charge.create(
        customer=customer.id,
        amount=5000,
        currency='usd',
        description='Flask Charge'
    )

    return "Charged successfully!"

if __name__ == "__main__":
    db.create_all()
    app.run(debug=True)
