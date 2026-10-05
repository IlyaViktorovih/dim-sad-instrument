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
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
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

  if (password.length < 6) {
    if (status) status.textContent = "❌ Пароль має містити щонайменше 6 символів.";
    return;
  }

  if (password !== confirm) {
    if (status) status.textContent = "❌ Паролі не збігаються.";
    return;
  }

  if (status) status.textContent = "⏳ Зберігаємо новий пароль...";

  try {
    const { error } = await db.auth.updateUser({ password });

    if (error) {
      console.error(error);
      if (status) status.textContent = "❌ " + error.message;
      return;
    }

    await db.auth.signOut();
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

  window.adminDb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setTimeout(showPasswordRecovery, 0);
    }
  });
}

document.addEventListener("DOMContentLoaded", initPasswordRecoveryListener);
