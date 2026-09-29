// Passkey sign-in, or — the first time on a Mac with no passkey yet — passkey creation. The server
// (routes/auth.py) issues the challenge and checks everything; this only runs the browser side.

const card = document.getElementById("card");
const lead = document.getElementById("lead");
const button = document.getElementById("go");
const problem = document.getElementById("problem");
const creating = card.dataset.mode === "create";

lead.textContent = creating
  ? "Create a passkey for this Mac. It syncs through iCloud Keychain, so it will work on your other Mac too."
  : "Sign in with your passkey.";
button.textContent = creating ? "Create passkey" : "Sign in with passkey";

const toBytes = (b64url) => Uint8Array.from(atob(b64url.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const toB64url = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) throw new Error(response.status === 403 ? "refused" : `error ${response.status}`);
  return response.json();
}

async function create() {
  const options = await post("/auth/register/options");
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: toBytes(options.challenge),
      user: { ...options.user, id: toBytes(options.user.id) },
      excludeCredentials: options.excludeCredentials.map((c) => ({ ...c, id: toBytes(c.id) })),
    },
  });
  await post("/auth/register/verify", {
    id: credential.id,
    clientDataJSON: toB64url(credential.response.clientDataJSON),
    attestationObject: toB64url(credential.response.attestationObject),
  });
}

async function signIn() {
  const options = await post("/auth/login/options");
  const assertion = await navigator.credentials.get({
    publicKey: { ...options, challenge: toBytes(options.challenge) },
  });
  await post("/auth/login/verify", {
    id: assertion.id,
    clientDataJSON: toB64url(assertion.response.clientDataJSON),
    authenticatorData: toB64url(assertion.response.authenticatorData),
    signature: toB64url(assertion.response.signature),
  });
}

button.addEventListener("click", async () => {
  problem.hidden = true;
  button.disabled = true;
  try {
    await (creating ? create() : signIn());
    window.location.replace("/");
  } catch (err) {
    problem.textContent =
      err.name === "NotAllowedError"
        ? "The passkey prompt was cancelled or timed out. Try again."
        : "That passkey wasn't accepted. Try again, or check you're on http://localhost:8780.";
    problem.hidden = false;
    button.disabled = false;
  }
});

button.focus();
