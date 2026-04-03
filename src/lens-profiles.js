export const LENS_PROFILES = [
  {
    id: 'none',
    label: 'None',
    defaultDesqueezeFactor: 1.33,
    defaultDistortionAmount: 0,
    helpText: 'Select a supported lens profile to apply distortion correction after de-squeeze.'
  },
  {
    id: 'sirui-24mm-f28-anamorphic-133-fuji-x',
    label: 'Sirui 24mm f/2.8 Anamorphic 1.33x (Fuji X)',
    defaultDesqueezeFactor: 1.33,
    defaultDistortionAmount: 10,
    helpText: 'Published Fuji X user reports describe noticeable barrel distortion. Start around 10 and fine-tune in the 7 to 13 range depending on framing and focus distance.'
  }
];

const profileMap = new Map(LENS_PROFILES.map((profile) => [profile.id, profile]));

export function getLensProfiles() {
  return LENS_PROFILES;
}

export function getLensProfile(profileId) {
  return profileMap.get(profileId) || profileMap.get('none');
}
