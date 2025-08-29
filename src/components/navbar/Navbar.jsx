// VITE + REACT (no Next.js)
// Replace all Next.js navigation and server action logic with react-router-dom and your own API logic

import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import Button from "react-bootstrap/Button";
import Navbar from "react-bootstrap/Navbar";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import SideBar from "../sidebar/sidebar";
import { useAppSelector, useAppDispatch } from "../../GlobalRedux/hooks";
import { hideoffCanvas } from "../../GlobalRedux/Features/offcanvas/offcanvasSlice";
import {
  logout as logoutAction,
  login as loginAction,
  updateCountry,
  updateToken,
} from "../../GlobalRedux/Features/auth/authSlice";
import { setShortName } from "../../GlobalRedux/Features/country/countrySlice";
import {
  removeMapLayer,
  toggleSidebar,
  setSidebarCollapsed,
  setBounds,
} from "../../GlobalRedux/Features/map/mapSlice";
import { FaMoon, FaSun, FaInfoCircle } from "react-icons/fa";
import { FaToggleOff, FaToggleOn } from "react-icons/fa";
import { CiCircleChevLeft, CiCircleChevRight } from "react-icons/ci";
import { HiMenuAlt3, HiX } from "react-icons/hi";
import { get_url } from "../json/urls";

// Replace with your actual API logic!
async function logout() {
  // Example: await fetch('/api/logout', { method: 'POST' });
  // Return {success:true} or {success:false}
  return { success: true };
}

async function login(_, formData) {
  // Example: await fetch('/api/login', { method: 'POST', body: formData });
  // Return {success:true, countryId, token} or {success:false, errors:{...}}
  return { success: true, countryId: 1, token: "demo-token" };
}

function Navigationbar({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarCollapsed = useAppSelector(
    (state) => state.mapbox.sidebarCollapsed
  );
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [loading, setLoading] = useState(false);
  const [loginState, setLoginState] = useState(null);

  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const userCountry = useAppSelector((state) => state.auth.country);
  const isLoggedin = useAppSelector((state) => state.auth.isLoggedin);
  const selectedRegionRedux = useAppSelector(
    (state) => state.country.short_name
  );
  const [previewRegion, setPreviewRegion] = useState(null);

  useEffect(() => {
    function handleRegionSelected(e) {
      if (e && e.detail && e.detail.regionId) {
        setPreviewRegion(e.detail.regionId);
      }
    }
    window.addEventListener("regionSelected", handleRegionSelected);
    return () => {
      window.removeEventListener("regionSelected", handleRegionSelected);
    };
  }, []);

  const isVisible = useAppSelector((state) => state.offcanvas.isVisible);
  const currentId = useAppSelector((state) => state.offcanvas.currentId);
  const prevPathnameRef = useRef(pathname);

  const countriesxxx = [
    { id: 26, short_name: "PCN" },
    { id: 14, short_name: "VUT" },
    { id: 13, short_name: "SLB" },
    { id: 12, short_name: "WSM" },
    { id: 10, short_name: "PLW" },
    { id: 8, short_name: "NRU" },
    { id: 2, short_name: "FJI" },
    { id: 1, short_name: "PAC" },
    { id: 3, short_name: "TON" },
    { id: 5, short_name: "FSM" },
    { id: 6, short_name: "KIR" },
    { id: 9, short_name: "NIU" },
    { id: 11, short_name: "PNG" },
    { id: 4, short_name: "TUV" },
    { id: 7, short_name: "MHL" },
    { id: 16, short_name: "COK" },
    { id: 18, short_name: "ASM" },
    { id: 19, short_name: "WLF" },
    { id: 20, short_name: "NCL" },
    { id: 21, short_name: "TKL" },
    { id: 22, short_name: "PYF" },
    { id: 23, short_name: "MNP" },
    { id: 24, short_name: "GUM" },
  ];

  // Helper: get flag path by id
  function getCountryFlag(id) {
    const country = countriesxxx.find((c) => c.id === Number(id));
    if (!country || country.short_name === "PAC") return null;
    return `/flags/${country.short_name}.png`;
  }

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === null) {
      setDarkMode(true);
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else if (storedTheme === "dark") {
      setDarkMode(true);
      document.body.classList.add("dark-mode");
    } else {
      setDarkMode(false);
      document.body.classList.remove("dark-mode");
    }
  }, []);

  useEffect(() => {
    if (isLoggedin && pathname === "/") {
      const savedRegion = localStorage.getItem("selectedRegion");
      if (savedRegion) {
        fetchCountryBoundsAndZoom(savedRegion);
      }
    }
  }, [isLoggedin, pathname]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    if (isVisible && prevPathnameRef.current !== pathname) {
      dispatch(hideoffCanvas());
    }
    prevPathnameRef.current = pathname;
  }, [pathname, isVisible, dispatch]);

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
    document.body.classList.toggle("sb-sidenav-toggled");
  };

  // Drag functionality for mobile sidebar
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ y: 0 });

  const handleMobileDragStart = (e) => {
    if (e.type === "mousedown") {
      e.preventDefault();
    }
    setIsDragging(true);
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStartPos({ y: clientY });
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  const handleMobileDrag = (e) => {
    if (!isDragging) return;
    if (e.type === "mousemove") {
      e.preventDefault();
    }
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartPos.y - clientY;
    if (deltaY > 50 && sidebarCollapsed) {
      dispatch(toggleSidebar());
      setIsDragging(false);
    } else if (deltaY < -50 && !sidebarCollapsed) {
      dispatch(toggleSidebar());
      setIsDragging(false);
    }
  };

  const handleMobileDragEnd = () => {
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDragging && window.innerWidth <= 1004) {
        e.preventDefault();
        handleMobileDrag(e);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging && window.innerWidth <= 1004) {
        handleMobileDragEnd();
      }
    };

    const handleGlobalTouchMove = (e) => {
      if (isDragging && window.innerWidth <= 1004) {
        e.preventDefault();
        handleMobileDrag(e);
      }
    };

    const handleGlobalTouchEnd = (e) => {
      if (isDragging && window.innerWidth <= 1004) {
        handleMobileDragEnd();
      }
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("touchmove", handleGlobalTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleGlobalTouchEnd);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [isDragging, sidebarCollapsed, dragStartPos]);

  const handleLogoutWithMapReset = async () => {
    const response = await logout();
    if (response.success) {
      mapLayer.forEach((item) => {
        if (item.layer_information && item.layer_information.restricted === true) {
          dispatch(removeMapLayer({ id: item.id }));
        }
      });
      dispatch(logoutAction());
      dispatch(updateCountry(null));
      dispatch(updateToken(null));

      dispatch(
        setBounds({
          west: 100.0,
          east: 300.0,
          south: -45.0,
          north: 45.0,
        })
      );
      dispatch(setShortName(1));
      localStorage.removeItem("selectedRegion");

      if (pathname !== "/") {
        navigate("/");
      }
    }
  };

  const handleLogout = async () => {
    const response = await logout();
    if (response.success) {
      mapLayer.forEach((item) => {
        if (item.layer_information && item.layer_information.restricted === true) {
          dispatch(removeMapLayer({ id: item.id }));
        }
      });
      dispatch(logoutAction());
      dispatch(updateCountry(null));
      dispatch(updateToken(null));
      dispatch(
        setBounds({
          west: 100.0,
          east: 300.0,
          south: -45.0,
          north: 45.0,
        })
      );
      dispatch(setShortName(1));
      localStorage.removeItem("selectedRegion");
    }
  };

  const fetchCountryBoundsAndZoom = async (countryId) => {
    try {
      const response = await fetch(get_url("country"));
      if (response.ok) {
        const countries = await response.json();
        const country = countries.find((c) => c.id === parseInt(countryId));
        if (country) {
          dispatch(
            setBounds({
              west: country.west_bound_longitude,
              east: country.east_bound_longitude,
              south: country.south_bound_latitude,
              north: country.north_bound_latitude,
            })
          );
        }
      }
    } catch (error) {
      console.error("Error fetching country bounds:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      const dropdown = document.querySelector('[data-dropdown="login"]');
      const loginButton = document.querySelector('[data-button="login"]');
      if (
        dropdown &&
        !dropdown.contains(e.target) &&
        loginButton &&
        !loginButton.contains(e.target)
      ) {
        setLoginDropdownOpen(false);
      }
    }
    if (loginDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [loginDropdownOpen]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const result = await login(null, formData);

    setLoginState(result);
    setLoading(false);
    if (result.success) {
      dispatch(loginAction());
      dispatch(updateCountry(result.countryId));
      dispatch(updateToken(result.token));
      setShowLoginModal(false);
      localStorage.setItem("selectedRegion", result.countryId);
      dispatch(setShortName(result.countryId));
      await fetchCountryBoundsAndZoom(result.countryId);
      setLoginState(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100vh",
        width: "100vw",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Navbar */}
      <nav
        className="navbar"
        style={{
          width: "100%",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--color-surface)",
          boxShadow: "var(--card-shadow)",
          padding: "0 0.75rem 0 0.01rem",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 1000,
        }}
      >
        {/* Left: Flag, logo, and company name */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Country Flag Display */}
          {(() => {
            let flagCountryId = null;
            if (previewRegion) {
              flagCountryId = previewRegion;
            } else if (isLoggedin && userCountry) {
              flagCountryId = userCountry;
            } else {
              const persisted =
                typeof window !== "undefined"
                  ? localStorage.getItem("selectedRegion")
                  : null;
              flagCountryId = persisted || null;
            }
            if (!flagCountryId) return null;
            const flagSrc = getCountryFlag(flagCountryId);
            if (!flagSrc) return null;
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginRight: "-27px",
                  padding: "4px 4px",
                }}
              >
                <img
                  src={flagSrc}
                  alt="Country flag"
                  style={{
                    width: "80%",
                    height: 42,
                    objectFit: "cover",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            );
          })()}

          <button
            onClick={handleToggleSidebar}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-primary)",
              fontSize: "1.5rem",
              marginRight: "1rem",
              outline: "none",
              display: pathname === "/" ? "block" : "none",
            }}
            className="desktop-only"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          ></button>

          <Link to="/" style={{ textDecoration: "none" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--color-primary)",
                overflow: "hidden",
                padding: 0,
                marginLeft: "-8px",
                cursor: "pointer",
              }}
              className="navbar-logo"
            >
              <img
                src="/COSPPaC_white_crop2.png"
                alt="Pacific Ocean"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter:
                    "invert(34%) sepia(98%) saturate(7476%) hue-rotate(210deg) brightness(98%) contrast(101%)",
                }}
              />
            </div>
          </Link>
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: "var(--color-primary)",
              letterSpacing: 0.7,
            }}
            className="navbar-title"
          >
            Pacific Ocean Portal
          </span>
        </div>

        {/* Desktop Navigation */}
        <ul
          className="navbar-nav desktop-nav"
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          <li>
            <Link
              className={
                pathname === "/" ? "active-nav nav-link" : "nav-link"
              }
              to="/"
              style={{
                textShadow: "0 0 0.5px rgba(255, 255, 255, 0.8)",
              }}
            >
              Explorer
            </Link>
          </li>
          <li>
            <Link
              className={
                pathname === "/collections"
                  ? "active-nav nav-link"
                  : "nav-link"
              }
              to="/collections"
              style={{
                textShadow: "0 0 0.5px rgba(255, 255, 255, 0.8)",
              }}
            >
              Collections
            </Link>
          </li>
          <li>
            <Link
              className={
                pathname === "/library" ? "active-nav nav-link" : "nav-link"
              }
              to="/library"
              style={{
                textShadow: "0 0 0.5px rgba(255, 255, 255, 0.8)",
              }}
            >
              Library
            </Link>
          </li>
          <li>
            <Link
              className={
                pathname === "/aboutus" ? "active-nav nav-link" : "nav-link"
              }
              to="/aboutus"
              style={{
                textShadow: "0 0 0.5px rgba(255, 255, 255, 0.8)",
              }}
            >
              About Us
            </Link>
          </li>
          <li>
            {isLoggedin ? (
              <Button
                onClick={handleLogoutWithMapReset}
                style={{
                  borderRadius: 8,
                  fontWeight: 500,
                  backgroundColor: darkMode
                    ? undefined
                    : "rgba(255, 255, 255, 0.9)",
                  border: darkMode ? undefined : "1px solid var(--color-border)",
                  color: darkMode ? undefined : "var(--color-primary)",
                  padding: "8px 16px",
                }}
                variant={darkMode ? "success" : undefined}
              >
                Logout
              </Button>
            ) : (
              <div style={{ position: "relative" }}>
                <button
                  data-button="login"
                  onClick={(e) => {
                    e.preventDefault();
                    const rect = e.target.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + window.scrollY,
                      right: window.innerWidth - rect.right,
                    });
                    setLoginDropdownOpen((v) => !v);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: darkMode ? "white" : "var(--color-primary)",
                    cursor: "pointer",
                    padding: "8px 12px",
                    fontWeight: 500,
                    fontSize: "14px",
                  }}
                >
                  Login <span style={{ fontSize: "10px" }}>▼</span>
                </button>
              </div>
            )}
          </li>

          {/* Toggle switch for dark/light mode */}
          <li>
            <button
              onClick={toggleDarkMode}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-primary)",
                fontSize: "1.8rem",
                outline: "none",
                marginLeft: 2,
                marginRight: 2,
                verticalAlign: "middle",
              }}
              aria-label={darkMode ? "Dark mode enabled" : "Light mode enabled"}
            >
              {darkMode ? <FaToggleOn /> : <FaToggleOff />}
            </button>
          </li>
          <li>
            <button
              onClick={toggleDarkMode}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-primary)",
                fontSize: "1.2rem",
                outline: "none",
              }}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="mobile-menu-button"
          style={{
            display: "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-primary)",
            fontSize: "1.8rem",
            outline: "none",
            padding: "8px",
          }}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <HiX /> : <HiMenuAlt3 />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-dropdown"
          style={{
            position: "fixed",
            top: "60px",
            left: 0,
            right: 0,
            background: "var(--color-surface)",
            boxShadow: "var(--card-shadow)",
            zIndex: 1028,
            padding: "1rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link
                className={
                  pathname === "/" ? "active-nav nav-link-mobile" : "nav-link-mobile"
                }
                to="/"
                onClick={() => setMobileMenuOpen(false)}
              >
                Explorer
              </Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link
                className={
                  pathname === "/collections"
                    ? "active-nav nav-link-mobile"
                    : "nav-link-mobile"
                }
                to="/collections"
                onClick={() => setMobileMenuOpen(false)}
              >
                Collections
              </Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link
                className={
                  pathname === "/library"
                    ? "active-nav nav-link-mobile"
                    : "nav-link-mobile"
                }
                to="/library"
                onClick={() => setMobileMenuOpen(false)}
              >
                Library
              </Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link
                className={
                  pathname === "/experts"
                    ? "active-nav nav-link-mobile"
                    : "nav-link-mobile"
                }
                to="/experts"
                onClick={() => setMobileMenuOpen(false)}
              >
                Experts
              </Link>
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <Link
                className={
                  pathname === "/aboutus"
                    ? "active-nav nav-link-mobile"
                    : "nav-link-mobile"
                }
                to="/aboutus"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </Link>
            </li>
            <li
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {isLoggedin ? (
                <Button
                  onClick={() => {
                    handleLogoutWithMapReset();
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    fontWeight: 500,
                    backgroundColor: darkMode
                      ? undefined
                      : "rgba(255, 255, 255, 0.9)",
                    border: darkMode
                      ? undefined
                      : "1px solid var(--color-border)",
                    color: darkMode ? undefined : "var(--color-primary)",
                    padding: "8px 16px",
                  }}
                  variant={darkMode ? "success" : undefined}
                >
                  Logout
                </Button>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button
                    onClick={() => {
                      setShowLoginModal(true);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontWeight: 500,
                      padding: "8px 16px",
                    }}
                    variant="primary"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => {
                      setShowSignupModal(true);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 8,
                      fontWeight: 500,
                      padding: "8px 16px",
                    }}
                    variant="outline-primary"
                  >
                    Signup
                  </Button>
                </div>
              )}
            </li>
            <li
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                }}
              >
                <span style={{ color: "var(--color-text)", fontWeight: "500" }}>
                  Theme
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={toggleDarkMode}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-primary)",
                      fontSize: "1.5rem",
                      outline: "none",
                    }}
                    aria-label={
                      darkMode ? "Dark mode enabled" : "Light mode enabled"
                    }
                  >
                    {darkMode ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                  <button
                    onClick={toggleDarkMode}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-primary)",
                      fontSize: "1.2rem",
                      outline: "none",
                    }}
                    aria-label={
                      darkMode ? "Switch to light mode" : "Switch to dark mode"
                    }
                  >
                    {darkMode ? <FaSun /> : <FaMoon />}
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      )}

      {/* Login Modal */}
      <Modal
        show={showLoginModal}
        onHide={() => setShowLoginModal(false)}
        centered
        className="custom-modal"
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          closeVariant="white"
        >
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ backgroundColor: "var(--color-surface)", padding: "2rem" }}
        >
          <Form onSubmit={handleLoginSubmit}>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "var(--color-text)" }}>
                Username
              </Form.Label>
              <Form.Control
                type="text"
                name="username"
                placeholder="Enter your username"
                required
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label style={{ color: "var(--color-text)" }}>
                Password
              </Form.Label>
              <Form.Control
                type="password"
                name="password"
                placeholder="Enter your password"
                required
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </Form.Group>
            {loginState && loginState.errors && (
              <div className="alert alert-danger" role="alert">
                {Object.values(loginState.errors)
                  .flat()
                  .map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
              </div>
            )}
            <div className="d-grid gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                style={{
                  backgroundColor: "var(--color-primary)",
                  border: "none",
                  color: "white",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  fontWeight: "500",
                }}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      {/* Signup Modal */}
      <Modal
        show={showSignupModal}
        onHide={() => setShowSignupModal(false)}
        size="lg"
        centered
        className="custom-modal"
      >
        <Modal.Header
          closeButton
          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          closeVariant="white"
        >
          <Modal.Title>Signup</Modal.Title>
        </Modal.Header>
        <Modal.Body
          style={{ backgroundColor: "var(--color-surface)", padding: "2rem" }}
        >
          <div
            style={{
              fontSize: "1rem",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: "8px",
              padding: "1rem",
              color: "var(--color-text)",
            }}
          >
            <div className="d-flex align-items-start">
              <FaInfoCircle
                style={{
                  color: "#3b82f6",
                  marginRight: "0.75rem",
                  fontSize: "1.25rem",
                  marginTop: "2px",
                }}
              />
              <div>
                <p className="mb-0" style={{ lineHeight: "1.5" }}>
                  Please contact{" "}
                  <a
                    href="mailto:cosppac@spc.int"
                    style={{
                      color: "#3b82f6",
                      textDecoration: "underline",
                      fontWeight: "500",
                    }}
                  >
                    cosppac@spc.int
                  </a>{" "}
                  for registration.
                </p>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer
          style={{
            backgroundColor: "var(--color-surface)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <Button
            variant="primary"
            onClick={() => setShowSignupModal(false)}
            style={{
              backgroundColor: "var(--color-primary)",
              border: "none",
              color: "white",
              padding: "0.5rem 1.5rem",
              borderRadius: "6px",
              fontWeight: "500",
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Main content with sidebar */}
      <div
        style={{
          display: "flex",
          flex: 1,
          marginTop: 60,
          minHeight: "calc(100vh - 60px)",
          width: "100vw",
          background: "transparent",
          overflow: "hidden",
        }}
        className="main-content-wrapper"
      >
        {/* Desktop Sidebar - only show on Explorer page (/) */}
        {pathname === "/" && (
          <aside
            className="desktop-sidebar"
            style={{
              width: sidebarCollapsed ? 60 : "350px",
              transition: "width 0.3s",
              background: "var(--color-surface)",
              boxShadow: "var(--card-shadow)",
              minHeight: "calc(100vh - 60px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              padding: "24px 0",
              position: "relative",
              overflow: "visible",
              zIndex: 1000,
            }}
          >
            {/* Collapse/Expand button */}
            <button
              onClick={handleToggleSidebar}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                position: "fixed",
                top: 84,
                left: sidebarCollapsed ? "50px" : "370px",
                width: 32,
                height: 64,
                borderRadius: "0 32px 32px 0",
                background: "var(--color-surface)",
                border: "1px solid #495057",
                borderLeft: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                zIndex: 1050,
                transition: "all 0.3s ease",
                transform: sidebarCollapsed ? "translateX(0)" : "translateX(-100%)",
                opacity: hovered || sidebarCollapsed ? 1 : 0.8,
                boxShadow: "2px 0 4px rgba(0,0,0,0.1)",
                color: "#626875",
              }}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <CiCircleChevRight size={40} weight="bold" />
              ) : (
                <CiCircleChevLeft size={40} weight="bold" />
              )}
            </button>
            {/* Sidebar content */}
            <div
              style={{
                width: "100%",
                height: "100%",
                overflowY: "auto",
                paddingTop: sidebarCollapsed ? 0 : 20,
                paddingRight: sidebarCollapsed ? 0 : 8,
                paddingBottom: 0,
                paddingLeft: sidebarCollapsed ? 0 : 4,
                transition: "all 0.3s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                opacity: sidebarCollapsed ? 0 : 1,
                pointerEvents: sidebarCollapsed ? "none" : "auto",
                visibility: sidebarCollapsed ? "hidden" : "visible",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflowX: "hidden",
              }}
            >
              <div
                className="sidebar-scrollable"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  height: "100%",
                  overflowY: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <SideBar />
              </div>
            </div>

            {/* Collapsed indicator */}
            {sidebarCollapsed && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-90deg)",
                  whiteSpace: "nowrap",
                  fontSize: "12px",
                  color: "var(--color-secondary)",
                  opacity: 0.7,
                  pointerEvents: "none",
                  writingMode: "vertical-rl",
                }}
              >
                Sidebar
              </div>
            )}
          </aside>
        )}
        {/* Main content */}
        <main
          style={{
            flex: 1,
            background: "transparent",
            padding: 0,
            minHeight: "calc(100vh - 60px)",
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Sidebar - only show on Explorer page (/) */}
      {pathname === "/" && (
        <div className="mobile-sidebar-container">
          {/* Mobile drag handle */}
          <div
            className="mobile-drag-handle"
            onMouseDown={handleMobileDragStart}
            onTouchStart={handleMobileDragStart}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "20px",
              cursor: "row-resize",
              zIndex: 1029,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                background: "var(--color-border)",
                borderRadius: "2px",
                opacity: 0.6,
              }}
            />
          </div>
          <button
            onClick={handleToggleSidebar}
            className="mobile-sidebar-toggle"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="toggle-handle"></div>
          </button>
          <aside
            className={`mobile-sidebar ${
              sidebarCollapsed ? "collapsed" : "expanded"
            }`}
            style={{
              height: sidebarCollapsed ? "60px" : "350px",
              transition: "height 0.3s ease",
            }}
          >
            {!sidebarCollapsed && (
              <div className="mobile-sidebar-content">
                <SideBar />
              </div>
            )}
            {sidebarCollapsed && (
              <div className="mobile-sidebar-collapsed-text">
                Tap to expand tools
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Portal for login dropdown */}
      {loginDropdownOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            data-dropdown="login"
            style={{
              position: "fixed",
              top: dropdownPosition.top + 4,
              right: dropdownPosition.right,
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              minWidth: 120,
              zIndex: 9999999,
              isolation: "isolate",
              transform: "translateZ(0)",
            }}
          >
            <button
              onClick={() => {
                setShowLoginModal(true);
                setLoginDropdownOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                color: "var(--color-primary)",
                fontSize: "14px",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "var(--color-border)")
              }
              onMouseLeave={(e) => (e.target.style.background = "none")}
            >
              Login
            </button>
            <button
              onClick={() => {
                setShowSignupModal(true);
                setLoginDropdownOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                color: "var(--color-primary)",
                fontSize: "14px",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "var(--color-border)")
              }
              onMouseLeave={(e) => (e.target.style.background = "none")}
            >
              Signup
            </button>
          </div>,
          document.body
        )}

      {/* Render BottomOffCanvas only once at the top level */}
    </div>
  );
}

export default Navigationbar;