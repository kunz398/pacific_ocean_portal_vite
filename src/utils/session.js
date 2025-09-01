// JWT-based session management for Vite/React
import { SignJWT, jwtVerify } from "jose";

const SESSION_KEY = 'ocean_portal_session';
const secretKey = import.meta.env.VITE_SESSION_SECRET || 'default-secret-key-change-in-production';

if (!secretKey) {
  console.error("VITE_SESSION_SECRET environment variable is not set.");
}

const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(countryId, userId) {
  // 23 hours expiration (matching your Next.js version)
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000);
  
  const session = await encrypt({ countryId, userId, expiresAt });
  
  // Store in localStorage since we can't use HTTP-only cookies in client-side
  localStorage.setItem(SESSION_KEY, session);
  
  return session;
}

export async function deleteSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function encrypt(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d") // 1 day expiration
    .sign(encodedKey);
}

export async function decrypt(session = "") {
  try {
    if (!session) {
      return null;
    }

    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });

    return payload;
  } catch {
    return null;
  }
}

// Get session from localStorage
export const getSession = async () => {
  try {
    const sessionToken = localStorage.getItem(SESSION_KEY);
    if (!sessionToken) return null;
    
    const payload = await decrypt(sessionToken);
    
    // Check if session is expired
    if (payload?.expiresAt && new Date() > new Date(payload.expiresAt)) {
      await deleteSession();
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
};

// Check if user is logged in
export const isLoggedIn = async () => {
  const session = await getSession();
  return !!session?.userId;
};

// Get current user info
export const getCurrentUser = async () => {
  const session = await getSession();
  return session ? {
    userId: session.userId,
    countryId: session.countryId,
    expiresAt: session.expiresAt,
    // Add other user properties as needed
  } : null;
};
