export default function LoginPage() {
  return (
    <main>
      <h1>Sign in to Lensmor Monitor</h1>
      <form method="post" action="/api/auth/login">
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
