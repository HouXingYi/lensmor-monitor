const roles = [
  "Product Marketing Manager",
  "Product Manager",
  "Marketing Manager",
  "Founder",
  "Investor",
  "Other",
];

export default function OnboardingPage() {
  return (
    <main>
      <h1>Set up Lensmor Monitor</h1>
      <section>
        <h2>Step 1: Choose your role</h2>
        <ul>
          {roles.map((role) => (
            <li key={role}>{role}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Step 2: Add your product context</h2>
        <p>Name, URL, positioning, audience, selling points, edge, and strategic goal are required.</p>
      </section>
      <section>
        <h2>Step 3: Import competitors</h2>
        <p>Select or add at least one mock competitor to start monitoring.</p>
      </section>
    </main>
  );
}
