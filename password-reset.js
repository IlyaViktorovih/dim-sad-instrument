// Password reset for admin panel
function showPasswordReset() {
  const box = document.getElementById("passwordResetBox");
  const emailInput = document.getElementById("resetEmail");
  const status = document.getElementById("resetStatus");

  if (box) box.style.display = "block";

  if (emailInput) {
    const loginEmail = document.getElementById("email");
    if (loginEmail && loginEmail.value.trim()) {
      emailInput.value = loginEmail.value.trim();
    }
    emailInput.focus();
  }

  if (status) status.textContent = "";
}

function hidePasswordReset() {
  const box = document.getElementById("passwordResetBox");
  const status = document.getElementById("resetStatus");

  if (box) box.style.display = "none";
  if (status) status.textContent = "";
}

async function sendPasswordReset() {
  const emailInput = document.getElementById("resetEmail");
  const status = document.getElementById("resetStatus");
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email) {
    if (status) status.textContent = "❌ Введи email.";
    return;
  }

  if (status) status.textContent = "📧 Надсилаємо посилання...";

  try {
    const { error } = await window.adminDb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname + "?recovery=1"
    });

    if (error) {
      console.error(error);
      if (status) status.textContent = "❌ " + error.message;
      return;
    }

    if (status) {
      status.textContent = "✅ Посилання для зміни пароля надіслано на email.";
    }
  } catch (error) {
    console.error(error);
    if (status) status.textContent = "❌ Помилка: " + (error.message || "невідома помилка");
  }
}

function showPasswordRecovery() {
  const loginBox = document.getElementById("loginBox");
  const adminPanel = document.getElementById("adminPanel");
  if (loginBox) loginBox.classList.remove("hidden");
  if (adminPanel) adminPanel.classList.add("hidden");
  hidePasswordReset();
  const box = document.getElementById("passwordRecoveryBox");
  if (box) {
    box.style.display = "block";
  }
}

async function saveNewPassword() {
  const passwordInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmPassword");
  const status = document.getElementById("passwordRecoveryStatus");

  const password = passwordInput ? passwordInput.value : "";
  const confirm = confirmInput ? confirmInput.value : "";

  if (password.length < 12) {
    if (status) status.textContent = "❌ Пароль має містити щонайменше 12 символів.";
    return;
  }

  if (password !== confirm) {
    if (status) status.textContent = "❌ Паролі не збігаються.";
    return;
  }

  if (status) status.textContent = "⏳ Зберігаємо новий пароль...";

  try {
    const { error } = await window.adminDb.auth.updateUser({ password });

    if (error) {
      console.error(error);
      if (status) status.textContent = "❌ " + error.message;
      return;
    }

    await window.adminDb.auth.signOut();
    window.history.replaceState({}, "", window.location.pathname);
    hidePasswordReset();

    const recoveryBox = document.getElementById("passwordRecoveryBox");
    if (recoveryBox) recoveryBox.style.display = "none";

    const loginStatus = document.getElementById("loginStatus");
    if (loginStatus) {
      loginStatus.textContent = "✅ Пароль змінено. Увійди з новим паролем.";
    }
  } catch (error) {
    console.error(error);
    if (status) status.textContent = "❌ Помилка: " + (error.message || "невідома помилка");
  }
}

function initPasswordRecoveryListener() {
  if (!window.adminDb || window.adminPasswordRecoveryListener) return;
  window.adminPasswordRecoveryListener = true;

  const params = new URLSearchParams(window.location.search);
  const recoveryLink = params.get("recovery") === "1";
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const recoveryToken = hash.get("type") === "recovery";
  let recoveryConfirmed = false;

  window.adminDb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryConfirmed = true;
      setTimeout(showPasswordRecovery, 0);
    } else if (event === "INITIAL_SESSION" && session && recoveryLink && recoveryToken) {
      recoveryConfirmed = true;
      setTimeout(showPasswordRecovery, 0);
    }
  });

  // Supabase may complete processing the recovery URL before this script loads.
  // Only reveal the form for a link explicitly marked as a recovery link.
  if (recoveryLink && recoveryToken) {
    window.adminDb.auth.getSession().then(({ data, error }) => {
      if (!error && data?.session) {
        recoveryConfirmed = true;
        showPasswordRecovery();
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPasswordRecoveryListener);
} else {
  initPasswordRecoveryListener();
}

function toggleAdminPasswordChange() {
  const box = document.getElementById("adminPasswordChangeBox");
  if (!box) return;
  box.style.display = box.style.display === "none" ? "block" : "none";
}

async function changeAdminPassword() {
  const current = document.getElementById("adminCurrentPassword");
  const next = document.getElementById("adminNewPassword");
  const confirm = document.getElementById("adminConfirmPassword");
  const status = document.getElementById("adminChangePasswordStatus");
  const button = document.getElementById("adminSavePasswordButton");
  const oldPassword = current.value;
  const newPassword = next.value;
  if (!oldPassword || newPassword.length < 12 || newPassword !== confirm.value || newPassword === oldPassword) {
    status.textContent = "❌ Перевір поточний пароль, новий пароль (мінімум 12 символів), підтвердження та переконайся, що паролі різні.";
    return;
  }
  button.disabled = true;
  status.textContent = "⏳ Перевіряємо поточний пароль...";
  try {
    const client = window.adminDb;
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user?.email) throw new Error("Сесія закінчилась. Увійди знову.");
    const { error: verifyError } = await client.auth.signInWithPassword({ email: user.email, password: oldPassword });
    if (verifyError) throw new Error("Неправильний поточний пароль.");
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    current.value = "";
    next.value = "";
    confirm.value = "";
    status.textContent = "✅ Пароль змінено. Надалі використовуй новий пароль.";
  } catch (error) {
    status.textContent = "❌ " + (error.message || "Не вдалося змінити пароль.");
  } finally {
    button.disabled = false;
  }
}
