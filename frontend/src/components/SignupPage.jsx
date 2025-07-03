import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useFormik } from "formik";

const SignupPage = () => {
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const formik = useFormik({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
    },
    onSubmit: async (values) => {
      setErrorMessage("");
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage("Sign Up successful. Please login.");
          setTimeout(() => navigate("/login"), 1500);
        } else {
          setErrorMessage(data.message || "Signup failed");
        }
      } catch (err) {
        setErrorMessage("An error occurred during signup");
      }
    },
  });

  return (
    <div
      className="d-flex align-items-center auth px-0"
      style={{ minHeight: "100vh", background: "#f6f3fa" }}
    >
      <div className="row w-100 mx-0 justify-content-center">
        <div className="col-lg-4 mx-auto">
          <div
            className="auth-form-light text-left py-5 px-4 px-sm-5"
            style={{
              borderRadius: 12,
              background: "#ffffff",
              boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div className="brand-logo text-center mb-4">
              <img
                src="/logo.png"
                alt="logo"
                style={{ height: "15vh", marginBottom: 8 }}
              />
            </div>
            <h4
              style={{
                fontWeight: 600,
                marginBottom: 6,
                color: "#222",
                fontSize: 22,
              }}
            >
              New here?
            </h4>
            <h6
              className="font-weight-light"
              style={{
                color: "#777",
                fontWeight: 400,
                fontSize: 15,
                marginBottom: 28,
              }}
            >
              Signing up is easy. It only takes a few steps
            </h6>
            <form className="pt-3" onSubmit={formik.handleSubmit}>
              <div className="form-group mb-3">
                <input
                  type="text"
                  className="form-control form-control-lg"
                  name="name"
                  placeholder="Name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  required
                  style={{
                    background: "#faf8fc",
                    borderColor: "#f0e9ff",
                    fontWeight: 500,
                    fontSize: 15,
                    color: "#222",
                    padding: "18px 14px",
                    borderRadius: 6,
                  }}
                />
              </div>
              <div className="form-group mb-3">
                <input
                  type="tel"
                  className="form-control form-control-lg"
                  name="phone"
                  placeholder="Phone"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  required
                  style={{
                    background: "#faf8fc",
                    borderColor: "#f0e9ff",
                    fontWeight: 500,
                    fontSize: 15,
                    color: "#222",
                    padding: "18px 14px",
                    borderRadius: 6,
                  }}
                />
              </div>
              <div className="form-group mb-3">
                <input
                  type="email"
                  className="form-control form-control-lg"
                  name="email"
                  placeholder="Email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  required
                  style={{
                    background: "#faf8fc",
                    borderColor: "#f0e9ff",
                    fontWeight: 500,
                    fontSize: 15,
                    color: "#222",
                    padding: "18px 14px",
                    borderRadius: 6,
                  }}
                />
              </div>
              <div className="form-group mb-3">
                <input
                  type="password"
                  className="form-control form-control-lg"
                  name="password"
                  placeholder="Password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  required
                  style={{
                    background: "#faf8fc",
                    borderColor: "#f0e9ff",
                    fontWeight: 500,
                    fontSize: 15,
                    color: "#222",
                    padding: "18px 14px",
                    borderRadius: 6,
                  }}
                />
              </div>
              {errorMessage && (
                <div
                  className="mb-2 text-danger"
                  style={{ fontWeight: 500, fontSize: 14 }}
                >
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div
                  className="mb-2 text-success"
                  style={{ fontWeight: 500, fontSize: 14 }}
                >
                  {successMessage}
                </div>
              )}
              <div className="mt-3">
                <button
                  type="submit"
                  className="btn btn-block btn-lg font-weight-medium auth-form-btn"
                  style={{
                    background: "#a259ff",
                    color: "#fff",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    border: "none",
                    borderRadius: 6,
                    padding: "14px 0",
                    fontSize: 16,
                    width: "100%",
                  }}
                >
                  SIGN UP
                </button>
              </div>
              <div
                className="text-center mt-4 font-weight-light"
                style={{ fontSize: 15, color: "#888", fontWeight: 400 }}
              >
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary"
                  style={{
                    color: "#a259ff",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
