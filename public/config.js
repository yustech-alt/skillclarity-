/* Runtime configuration. Edit these two values, nothing else. */
window.SKILLCLARITY_CONFIG = {
  /*
   * Where registrations are stored.
   *  - "formspree": set formspreeId below (https://formspree.io -> New form -> copy the id in the endpoint URL)
   *  - "local":     posts to the bundled Node server in ../server (writes data/signups.jsonl)
   */
  submitMode: "local",
  formspreeId: "REPLACE_WITH_FORMSPREE_ID",
  localEndpoint: "/api/signup",

  /* Analytics. Leave plausibleDomain empty to use only the built-in counter. */
  plausibleDomain: "",
  countEndpoint: "/api/event",

  /* Shown in the success message. */
  onboardingDays: "3 days",
};
