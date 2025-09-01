// API functions for Vite/React authentication
import { createSession, deleteSession } from './session.js';
import { get_url } from '../components/json/urls';

// Validation function for login data
const validateLoginData = (username, password) => {
  const errors = {};
  
  if (!username || username.trim().length < 3) {
    errors.username = ["Username must be at least 3 characters"];
  }
  
  if (!password || password.trim().length < 8) {
    errors.password = ["Password must be at least 8 characters"];
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export async function login(username, password) {
  // Validate form data
  const validation = validateLoginData(username, password);
  
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  try {
    // Send credentials to the external API
    const apiResponse = await fetch(get_url('root-path') + "/middleware/api/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    // Handle API response
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      return {
        success: false,
        errors: {
          username: [errorData.detail || "Invalid credentials"],
        },
        message: errorData.detail || "Login failed",
      };
    }

    const { access } = await apiResponse.json();
    
    // Fetch the user's account details using the access token
    const accountResponse = await fetch(get_url('root-path') + "/middleware/api/account/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access}`,
      },
    });

    if (!accountResponse.ok) {
      const errorData = await accountResponse.json().catch(() => ({}));
      return {
        success: false,
        errors: {
          username: [errorData.detail || "Failed to fetch account details"],
        },
        message: errorData.detail || "Failed to fetch account details",
      };
    }
    
    const accountData = await accountResponse.json();
    let country_idx = "";

    if (Array.isArray(accountData) && accountData.length > 0) {
      // Find the account object that matches the username
      const userObj = accountData.find(acc => acc.user.email === username);
    
      if (userObj) {
        country_idx = userObj.country.id;
      }
    
      // Store the countryId and access token in the session
      await createSession(country_idx, access);
    }

    // Return success with data
    return { 
      success: true, 
      countryId: country_idx, 
      token: access 
    };
  } catch (error) {
    console.error("API request failed:", error);
    return {
      success: false,
      errors: {
        username: ["An error occurred while logging in"],
      },
      message: "An error occurred while logging in",
    };
  }
}

export async function logout() {
  try {
    await deleteSession();
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false };
  }
}