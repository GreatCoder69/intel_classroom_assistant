import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form } from "react-bootstrap";
import { Formik } from "formik";

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (data.accessToken && data.user) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.user));
        if (data.user.isAdmin) {
          navigate("/admin");
        } else {
          navigate("/chat");
        }
      } else {
        alert("Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login error.");
    }
  };

  return (
    <div
      className="d-flex align-items-center auth px-0"
      style={{ backgroundColor: "#f5f0f7", minHeight: "100vh" }}
    >
      <div className="row w-100 mx-0 justify-content-center">
        <div className="col-lg-4 mx-auto">
          <div
            className="auth-form-light text-center py-5 px-4 px-sm-5"
            style={{ backgroundColor: "#fff", borderRadius: "8px" }}
          >
            <div className="brand-logo text-center">
              <img
                src="/logo.png"
                alt="logo"
                style={{ height: "15vh", marginBottom: "20px" }}
              />
            </div>
            <h4>Hello! let's get started</h4>
            <h6 className="font-weight-light mb-4">Sign in to continue.</h6>

            <Formik
              initialValues={{ email: "", password: "" }}
              onSubmit={handleLogin}
            >
              {({ handleSubmit, handleChange, values }) => (
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Username"
                      size="lg"
                      className="h-auto"
                      value={values.email}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="Password"
                      size="lg"
                      className="h-auto"
                      value={values.password}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                  <div className="mt-3">
                    <button
                      type="submit"
                      className="btn btn-block btn-lg font-weight-medium auth-form-btn"
                      style={{
                        backgroundColor: "#a959ff",
                        color: "#fff",
                        border: "none",
                        width: "100%",
                      }}
                    >
                      SIGN IN
                    </button>
                  </div>
                  <div className="my-3 d-flex justify-content-between align-items-center">
                    <div className="form-check">
                      <label className="form-check-label text-muted">
                        <input type="checkbox" className="form-check-input" />
                        <i className="input-helper"></i>
                        Keep me signed in
                      </label>
                    </div>
                    <a
                      href="!#"
                      onClick={(e) => e.preventDefault()}
                      className="auth-link text-black"
                      style={{ fontSize: "14px" }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="text-center mt-4 font-weight-light">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-primary">
                      Create
                    </Link>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
