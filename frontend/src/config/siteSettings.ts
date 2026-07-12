export interface SocialLink {
  platform: string;
  name: string;
  url: string;
}

export interface BeianData {
  icp_number: string;
  police_number: string;
  copyright: string;
}

export const socialLinks: SocialLink[] = [
  {
    platform: 'github',
    name: 'GitHub',
    url: 'https://github.com/mikulc/pudding-resume',
  },
  {
    platform: 'email',
    name: 'Email',
    url: 'mailto:mikulc33@gmail.com',
  },
  {
    platform: 'qq',
    name: 'QQ',
    url: 'https://qm.qq.com/q/uyt2KaFEjK',
  },
];

export const beian: BeianData = {
  icp_number: '萌ICP备20266610号',
  police_number: '',
  copyright: '© 2026 布丁简历. All rights reserved.',
};
