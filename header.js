import { listenToAuthState, logoutUser, loginWithEmail, loginWithGoogle, signUpWithEmail } from './auth.js';

// Replace with your actual admin email address
const ADMIN_EMAIL = "nktony380@gmail.com"; 

export function initHeaderAuth() {
  // Inject Auth Modal into DOM if it doesn't exist
  if (!document.getElementById("authModal")) {
    const modalHTML = `
      <div id="authModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; justify-content:center; align-items:center;">
        <div class="modal-content" style="background:#1e1e2f; padding:30px; border-radius:12px; width:320px; color:#fff; text-align:center; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
          <h2 id="authModalTitle" style="margin-bottom:20px;">Sign In</h2>
          <input type="email" id="authEmail" placeholder="Email" required style="width:100%; padding:10px; margin-bottom:12px; border-radius:6px; border:1px solid #444; background:#2a2a3f; color:#fff;" />
          <input type="password" id="authPassword" placeholder="Password" required style="width:100%; padding:10px; margin-bottom:16px; border-radius:6px; border:1px solid #444; background:#2a2a3f; color:#fff;" />
          
          <button id="authSubmitBtn" style="width:100%; padding:10px; background:#4f46e5; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; margin-bottom:10px;">Log In</button>
          <button id="googleAuthBtn" style="width:100%; padding:10px; background:#db4437; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; margin-bottom:16px;">Sign in with Google</button>
          
          <p style="font-size:14px; margin-bottom:15px; cursor:pointer; color:#93c5fd;" id="toggleAuthMode">Need an account? Sign up</p>
          <button id="closeAuthModal" style="background:transparent; border:none; color:#aaa; cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  // Find or create an auth container in your nav/sidebar
  let authContainer = document.getElementById("authContainer");
  if (!authContainer) {
    authContainer = document.createElement("div");
    authContainer.id = "authContainer";
    authContainer.style.cssText = "margin-left: auto; display: flex; align-items: center; gap: 10px;";
    
    const targetNav = document.querySelector(".sidebar") || document.querySelector("nav") || document.querySelector("header");
    if (targetNav) {
      targetNav.appendChild(authContainer);
    } else {
      document.body.insertBefore(authContainer, document.body.firstChild);
    }
  }

  let isSignUp = false;

  // Listen to Auth State Changes
  listenToAuthState((user, profile) => {
    const sidebarNav = document.querySelector(".sidebar ul");

    if (user) {
      authContainer.innerHTML = `
        <span style="font-size: 14px; opacity: 0.9;">👤 ${user.email}</span>
        <button id="logoutBtn" style="padding: 6px 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">Logout</button>
      `;
      document.getElementById("logoutBtn").addEventListener("click", async () => {
        await logoutUser();
        localStorage.clear();
        window.location.reload();
      });
      
      // Close modal if open
      document.getElementById("authModal").style.display = "none";

  // ⚙️ DISCREET ADMIN LINK INJECTION
      if (user.email === ADMIN_EMAIL) {
        let adminLink = document.getElementById("adminNavLinkId");
        if (!adminLink) {
          const sidebar = document.querySelector(".sidebar") || document.querySelector("nav");
          if (sidebar) {
            const adminEl = document.createElement("a");
            adminEl.id = "adminNavLinkId";
            adminEl.href = "admin.html";
            adminEl.textContent = "⚙️ Admin Panel";
            adminEl.style.cssText = "display: block; padding: 12px 20px; color: #ffd700; font-weight: bold; text-decoration: none; margin-top: 10px;";
            sidebar.appendChild(adminEl);
          }
        }
      }

    } else {
      authContainer.innerHTML = `
        <button id="openAuthBtn" style="padding: 6px 14px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">Sign In</button>
      `;
      document.getElementById("openAuthBtn").addEventListener("click", () => {
        document.getElementById("authModal").style.display = "flex";
      });

      // Remove admin link on logout
      const adminLink = document.getElementById("adminNavLinkId");
      if (adminLink) {
        adminLink.remove();
      }
    }
  });

  // Modal Interactive Elements
  const modal = document.getElementById("authModal");
  document.getElementById("closeAuthModal").addEventListener("click", () => {
    modal.style.display = "none";
  });

  const toggleMode = document.getElementById("toggleAuthMode");
  const modalTitle = document.getElementById("authModalTitle");
  const submitBtn = document.getElementById("authSubmitBtn");

  toggleMode.addEventListener("click", () => {
    isSignUp = !isSignUp;
    modalTitle.textContent = isSignUp ? "Sign Up" : "Sign In";
    submitBtn.textContent = isSignUp ? "Create Account" : "Log In";
    toggleMode.textContent = isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up";
  });

  submitBtn.addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value;
    const password = document.getElementById("authPassword").value;
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById("googleAuthBtn").addEventListener("click", async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      alert(err.message);
    }
  });
}