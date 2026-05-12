import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/instellingen.css";

const initialMember = {
  firstName: "",
  lastName: "",
  email: "",
};

const initialForm = {
  practiceName: "",
  contactFirstName: "",
  contactLastName: "",
  practiceCountry: "België",
  practiceStreet: "",
  practiceNumber: "",
  practicePostalCode: "",
  practiceCity: "",

  phone: "",
  emailGeneral: "",
  emailBilling: "",
  kvkNumber: "",
  vatNumber: "",

  billingSameAsPractice: false,
  billingName: "",
  billingCountry: "België",
  billingStreet: "",
  billingNumber: "",
  billingPostalCode: "",
  billingCity: "",
};

export default function TeamUpgradeFlow() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [user, setUser] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [teamMembers, setTeamMembers] = useState([{ ...initialMember }]);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateMember(index, field, value) {
    setTeamMembers((prev) =>
      prev.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    );
  }

  function addMember() {
    setTeamMembers((prev) => [...prev, { ...initialMember }]);
  }

  function removeMember(index) {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  }

  async function loadUser() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        navigate("/");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", authUser.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData || profileData.role !== "kinesist") {
        navigate("/");
        return;
      }

      setUser(authUser);

      const fullNameParts = (profileData.full_name || "").trim().split(/\s+/);

      setForm((prev) => ({
        ...prev,
        contactFirstName: fullNameParts[0] || "",
        contactLastName: fullNameParts.slice(1).join(" "),
        emailGeneral: authUser.email || "",
        emailBilling: authUser.email || "",
      }));
    } catch (error) {
      console.error(error);
      setErrorMessage("Upgrade flow kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  function validateStep1() {
    if (!form.practiceName.trim()) {
      setErrorMessage("Praktijknaam is verplicht.");
      return false;
    }

    if (!form.contactFirstName.trim() || !form.contactLastName.trim()) {
      setErrorMessage("Contactpersoon is verplicht.");
      return false;
    }

    if (!form.practiceStreet.trim() || !form.practiceNumber.trim()) {
      setErrorMessage("Praktijkadres is verplicht.");
      return false;
    }

    if (!form.practicePostalCode.trim() || !form.practiceCity.trim()) {
      setErrorMessage("Plaatsgegevens zijn verplicht.");
      return false;
    }

    if (!form.phone.trim()) {
      setErrorMessage("Telefoonnummer is verplicht.");
      return false;
    }

    if (!form.emailGeneral.trim()) {
      setErrorMessage("Algemeen e-mailadres is verplicht.");
      return false;
    }

    if (!form.emailBilling.trim()) {
      setErrorMessage("Facturatie e-mailadres is verplicht.");
      return false;
    }

    if (!form.billingSameAsPractice) {
      if (!form.billingName.trim()) {
        setErrorMessage("Naam van factuuradres is verplicht.");
        return false;
      }

      if (!form.billingStreet.trim() || !form.billingNumber.trim()) {
        setErrorMessage("Factuuradres is verplicht.");
        return false;
      }

      if (!form.billingPostalCode.trim() || !form.billingCity.trim()) {
        setErrorMessage("Factuur plaatsgegevens zijn verplicht.");
        return false;
      }
    }

    return true;
  }

  function validateStep2() {
    for (const member of teamMembers) {
      const hasAnyValue =
        member.firstName.trim() ||
        member.lastName.trim() ||
        member.email.trim();

      if (!hasAnyValue) continue;

      if (!member.firstName.trim() || !member.lastName.trim() || !member.email.trim()) {
        setErrorMessage("Vul per gebruiker voornaam, achternaam en e-mailadres volledig in.");
        return false;
      }
    }

    return true;
  }

  function handleNext() {
    setErrorMessage("");
    setSuccessMessage("");

    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    }
  }

  function handleBack() {
    setErrorMessage("");
    setSuccessMessage("");

    if (step === 1) {
      navigate("/kinesist/instellingen");
      return;
    }

    setStep((prev) => prev - 1);
  }

  async function handleSubmitUpgrade() {
    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!user) {
        setErrorMessage("Gebruiker niet gevonden.");
        return;
      }

      const billingName = form.billingSameAsPractice
        ? form.practiceName.trim()
        : form.billingName.trim();

      const billingCountry = form.billingSameAsPractice
        ? form.practiceCountry.trim()
        : form.billingCountry.trim();

      const billingStreet = form.billingSameAsPractice
        ? form.practiceStreet.trim()
        : form.billingStreet.trim();

      const billingNumber = form.billingSameAsPractice
        ? form.practiceNumber.trim()
        : form.billingNumber.trim();

      const billingPostalCode = form.billingSameAsPractice
        ? form.practicePostalCode.trim()
        : form.billingPostalCode.trim();

      const billingCity = form.billingSameAsPractice
        ? form.practiceCity.trim()
        : form.billingCity.trim();

      const { data: practice, error: practiceError } = await supabase
        .from("practices")
        .insert({
          owner_id: user.id,
          name: form.practiceName.trim(),
          contact_first_name: form.contactFirstName.trim(),
          contact_last_name: form.contactLastName.trim(),
          phone: form.phone.trim(),
          email_general: form.emailGeneral.trim(),
          email_billing: form.emailBilling.trim(),
          kvk_number: form.kvkNumber.trim() || null,
          vat_number: form.vatNumber.trim() || null,

          practice_country: form.practiceCountry.trim(),
          practice_street: form.practiceStreet.trim(),
          practice_number: form.practiceNumber.trim(),
          practice_postal_code: form.practicePostalCode.trim(),
          practice_city: form.practiceCity.trim(),

          billing_same_as_practice: form.billingSameAsPractice,
          billing_name: billingName || null,
          billing_country: billingCountry || null,
          billing_street: billingStreet || null,
          billing_number: billingNumber || null,
          billing_postal_code: billingPostalCode || null,
          billing_city: billingCity || null,
        })
        .select()
        .single();

      if (practiceError) throw practiceError;

      const { error: ownerMemberError } = await supabase
        .from("practice_members")
        .insert({
          practice_id: practice.id,
          profile_id: user.id,
          role: "owner",
        });

      if (ownerMemberError) throw ownerMemberError;

      const invites = teamMembers
        .filter(
          (member) =>
            member.firstName.trim() &&
            member.lastName.trim() &&
            member.email.trim()
        )
        .map((member) => ({
          practice_id: practice.id,
          first_name: member.firstName.trim(),
          last_name: member.lastName.trim(),
          email: member.email.trim(),
          status: "pending",
        }));

      if (invites.length > 0) {
        const { error: inviteError } = await supabase
          .from("practice_invites")
          .insert(invites);

        if (inviteError) throw inviteError;
      }

      navigate("/kinesist/instellingen");
        } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Upgrade opslaan is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="kineDashLoading">
        <img src="/images/monkey-load.png" style={{ width: "100px" }} alt="" />
        <p>laden . . .</p>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="teamUpgradePage">
        <button type="button" className="teamUpgradeBack" onClick={handleBack}>
          <img src="/images/back-icon.svg" alt="" className="patientBack"/>
          <span>Terug</span>
        </button>

        <div className="teamUpgradeStepMeta">Stap {step} van 3</div>

        <div className="teamUpgradeProgress">
          <div className={`teamUpgradeProgressItem ${step >= 1 ? "is-active" : ""}`} />
          <div className={`teamUpgradeProgressItem ${step >= 2 ? "is-active" : ""}`} />
          <div className={`teamUpgradeProgressItem ${step >= 3 ? "is-active" : ""}`} />
        </div>

        <h1>Upgrade naar Team</h1>

        {errorMessage && <p className="kineError">{errorMessage}</p>}
        {successMessage && <p className="kineSuccess">{successMessage}</p>}

        {step === 1 && (
          <>
            <section className="teamUpgradeGrid">
              <div className="teamUpgradeCard">
                <h2>Praktijkadres</h2>

                <div className="teamUpgradeField">
                  <label>Praktijknaam</label>
                  <input
                    value={form.practiceName}
                    onChange={(e) => updateField("practiceName", e.target.value)}
                  />
                </div>

                  <div className="teamUpgradeField">
                    <label>Voornaam contactpersoon</label>
                    <input
                      value={form.contactFirstName}
                      onChange={(e) => updateField("contactFirstName", e.target.value)}
                    />
                  </div>

                  <div className="teamUpgradeField">
                    <label>Achternaam contactpersoon</label>
                    <input
                      value={form.contactLastName}
                      onChange={(e) => updateField("contactLastName", e.target.value)}
                    />
                  </div>

                <div className="teamUpgradeField">
                  <label>Land</label>
                  <input
                    value={form.practiceCountry}
                    onChange={(e) => updateField("practiceCountry", e.target.value)}
                  />
                </div>

                <div className="teamUpgradeDouble">
                  <div className="teamUpgradeField">
                    <label>Straatnaam</label>
                    <input
                      value={form.practiceStreet}
                      onChange={(e) => updateField("practiceStreet", e.target.value)}
                    />
                  </div>

                  <div className="teamUpgradeField">
                    <label>Nr</label>
                    <input
                      value={form.practiceNumber}
                      onChange={(e) => updateField("practiceNumber", e.target.value)}
                    />
                  </div>
                </div>

                <div className="teamUpgradeDouble">
                  <div className="teamUpgradeField">
                    <label>Postcode</label>
                    <input
                      value={form.practicePostalCode}
                      onChange={(e) => updateField("practicePostalCode", e.target.value)}
                    />
                  </div>

                  <div className="teamUpgradeField">
                    <label>Plaatsnaam</label>
                    <input
                      value={form.practiceCity}
                      onChange={(e) => updateField("practiceCity", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="teamUpgradeCard">
                <h2>Overige</h2>

                <div className="teamUpgradeField">
                  <label>Telefoonnummer</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                  />
                </div>

                <div className="teamUpgradeField">
                  <label>E-mailadres algemeen</label>
                  <input
                    value={form.emailGeneral}
                    onChange={(e) => updateField("emailGeneral", e.target.value)}
                  />
                </div>

                <div className="teamUpgradeField">
                  <label>E-mailadres facturen</label>
                  <input
                    value={form.emailBilling}
                    onChange={(e) => updateField("emailBilling", e.target.value)}
                  />
                </div>

                <div className="teamUpgradeField">
                  <label>KVK-nummer</label>
                  <input
                    value={form.kvkNumber}
                    onChange={(e) => updateField("kvkNumber", e.target.value)}
                    placeholder="Optioneel"
                  />
                </div>

                <div className="teamUpgradeField">
                  <label>BTW-nummer</label>
                  <input
                    value={form.vatNumber}
                    onChange={(e) => updateField("vatNumber", e.target.value)}
                    placeholder="Optioneel"
                  />
                </div>
              </div>
            </section>

            <label className="teamUpgradeCheckbox">
              <input
                type="checkbox"
                checked={form.billingSameAsPractice}
                onChange={(e) =>
                  updateField("billingSameAsPractice", e.target.checked)
                }
              />
              <span>Praktijkadres is hetzelfde als factuuradres.</span>
            </label>

            {!form.billingSameAsPractice && (
              <section className="teamUpgradeBillingBlock">
                <div className="teamUpgradeCard teamUpgradeCard--small">
                  <h2>Factuuradres</h2>

                  <div className="teamUpgradeField">
                    <label>Naam</label>
                    <input
                      value={form.billingName}
                      onChange={(e) => updateField("billingName", e.target.value)}
                    />
                  </div>

                  <div className="teamUpgradeField">
                    <label>Land</label>
                    <input
                      value={form.billingCountry}
                      onChange={(e) => updateField("billingCountry", e.target.value)}
                    />
                  </div>

                  <div className="teamUpgradeDouble">
                    <div className="teamUpgradeField">
                      <label>Straatnaam</label>
                      <input
                        value={form.billingStreet}
                        onChange={(e) => updateField("billingStreet", e.target.value)}
                      />
                    </div>

                    <div className="teamUpgradeField">
                      <label>Nr</label>
                      <input
                        value={form.billingNumber}
                        onChange={(e) => updateField("billingNumber", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="teamUpgradeDouble">
                    <div className="teamUpgradeField">
                      <label>Postcode</label>
                      <input
                        value={form.billingPostalCode}
                        onChange={(e) =>
                          updateField("billingPostalCode", e.target.value)
                        }
                      />
                    </div>

                    <div className="teamUpgradeField">
                      <label>Plaatsnaam</label>
                      <input
                        value={form.billingCity}
                        onChange={(e) => updateField("billingCity", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="teamUpgradeActions">
              <button type="button" className="btn-primary-large" onClick={handleNext}>
                Volgende
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <section className="teamUpgradeMembersBlock">
              {teamMembers.map((member, index) => (
                <div key={index} className="teamMemberRow">
                  <h3>Gebruiker {index + 1}</h3>

                  <div className="teamUpgradeField">
                    <input
                      placeholder="Voornaam"
                      value={member.firstName}
                      onChange={(e) =>
                        updateMember(index, "firstName", e.target.value)
                      }
                    />
                  </div>

                  <div className="teamUpgradeField">
                    <input
                      placeholder="Achternaam"
                      value={member.lastName}
                      onChange={(e) =>
                        updateMember(index, "lastName", e.target.value)
                      }
                    />
                  </div>

                  <div className="teamUpgradeField">
                    <input
                      placeholder="E-mailadres"
                      value={member.email}
                      onChange={(e) =>
                        updateMember(index, "email", e.target.value)
                      }
                    />
                  </div>

                  {teamMembers.length > 1 && (
                    <button
                      type="button"
                      className="teamRemoveMemberBtn"
                      onClick={() => removeMember(index)}
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="teamAddMemberBtn" onClick={addMember}>
                ＋ Gebruiker toevoegen
              </button>
            </section>

            <div className="teamUpgradeActions">
              <button type="button" className="btn-primary-large" onClick={handleNext}>
                Volgende
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <section className="teamUpgradeReview">
              <div className="teamUpgradeCard">
                <h2>Overzicht</h2>

                <div className="teamReviewItem">
                  <strong>Praktijk</strong>
                  <span>{form.practiceName || "-"}</span>
                </div>

                <div className="teamReviewItem">
                  <strong>Contactpersoon</strong>
                  <span>
                    {form.contactFirstName} {form.contactLastName}
                  </span>
                </div>

                <div className="teamReviewItem">
                  <strong>Adres</strong>
                  <span>
                    {form.practiceStreet} {form.practiceNumber}, {form.practicePostalCode}{" "}
                    {form.practiceCity}, {form.practiceCountry}
                  </span>
                </div>

                <div className="teamReviewItem">
                  <strong>Algemeen e-mailadres</strong>
                  <span>{form.emailGeneral || "-"}</span>
                </div>

                <div className="teamReviewItem">
                  <strong>Facturatie e-mailadres</strong>
                  <span>{form.emailBilling || "-"}</span>
                </div>

                <div className="teamReviewItem">
                  <strong>Teamleden</strong>
                  <span>
                    {
                      teamMembers.filter(
                        (member) =>
                          member.firstName.trim() &&
                          member.lastName.trim() &&
                          member.email.trim()
                      ).length
                    }
                  </span>
                </div>
              </div>
            </section>

            <div className="teamUpgradeActions">
              <button
                type="button"
                className="btn-primary-large"
                onClick={handleSubmitUpgrade}
                disabled={saving}
              >
                {saving ? "Opslaan..." : "Bevestigen"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}