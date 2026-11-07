export const bankProfiles = [
  {
    id: "nubank-pf",
    label: "Nubank PF",
    institution: "Nubank",
    holderType: "PF",
    color: "#820AD1",
  },
  {
    id: "nubank-pj",
    label: "Nubank PJ",
    institution: "Nubank",
    holderType: "PJ",
    color: "#820AD1",
  },
  {
    id: "inter-pf",
    label: "Inter PF",
    institution: "Inter",
    holderType: "PF",
    color: "#E87524",
  },
  {
    id: "inter-pj",
    label: "Inter PJ",
    institution: "Inter",
    holderType: "PJ",
    color: "#E87524",
  },
];
export function bankProfile(id) {
  return bankProfiles.find((profile) => profile.id === id) || null;
}
