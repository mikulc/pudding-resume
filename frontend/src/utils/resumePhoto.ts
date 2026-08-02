import type { ResumeData } from '../types/resume';

const DEFAULT_TEMPLATE_AVATAR_URL = '/images/avatar.jpg';
let defaultAvatarAvailability: Promise<boolean> | null = null;

function checkDefaultAvatarAvailability(): Promise<boolean> {
  if (defaultAvatarAvailability) return defaultAvatarAvailability;

  defaultAvatarAvailability = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = DEFAULT_TEMPLATE_AVATAR_URL;
  });

  return defaultAvatarAvailability;
}

/** Remove the seeded demo avatar when its public asset is not deployed. */
export async function removeUnavailableDefaultAvatar(data: ResumeData): Promise<ResumeData> {
  if (data.personalInfo?.photoUrl !== DEFAULT_TEMPLATE_AVATAR_URL) return data;
  if (typeof Image === 'undefined' || await checkDefaultAvatarAvailability()) return data;

  return {
    ...data,
    personalInfo: {
      ...data.personalInfo,
      photoUrl: '',
    },
  };
}
