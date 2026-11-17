"use strict";

/* ---------- Google 登入狀態 ---------- */

async function initializeAuthUI() {
  const loginLink = $("#authLogin");
  const profile = $("#authProfile");
  const name = $("#authName");
  const avatar = $("#authAvatar");
  const logoutButton = $("#authLogout");

  if (!loginLink || !profile || !name || !avatar || !logoutButton) return;

  if (window.location.protocol === "file:") {
    loginLink.classList.add("hidden");
    return;
  }

  loginLink.href = new URL("api/auth/google/login", window.location.href).href;

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const response = await fetch(
        new URL("api/auth/logout", window.location.href),
        { method: "POST", credentials: "same-origin" }
      );
      if (!response.ok) {
        throw new Error(`登出失敗：HTTP ${response.status}`);
      }
      window.location.reload();
    } catch (error) {
      logoutButton.disabled = false;
      console.error("無法登出", error);
      showToast("登出失敗，請稍後再試。");
    }
  });

  try {
    const response = await fetch(
      new URL("api/auth/me", window.location.href),
      { credentials: "same-origin", cache: "no-store" }
    );
    if (response.status === 401) return;
    if (!response.ok) {
      throw new Error(`無法讀取登入狀態：HTTP ${response.status}`);
    }

    const member = await response.json();
    name.textContent = member.name || member.email;
    if (typeof member.picture === "string" &&
        member.picture.startsWith("https://")) {
      avatar.src = member.picture;
      avatar.classList.remove("hidden");
    }
    loginLink.classList.add("hidden");
    profile.classList.remove("hidden");
    canAccessExperiments = member.can_access_experiments === true;
    $$("[data-experiment-access]").forEach((element) => {
      element.classList.toggle("hidden", !canAccessExperiments);
    });
    if (canAccessExperiments) {
      navigateToPage("video");
    }
  } catch (error) {
    console.error("無法讀取登入狀態", error);
    showToast("目前無法連線到登入服務。");
  }
}
