export interface Project {
  name: string;
  description: string;
  previews?: string[];
  fullResPreviews?: string[];
  date?: string;
  skills?: string[] | string[][];
  icon?: string;
  link?: string;       // GitHub URL for code projects, YouTube URL for videos
}

export interface ProjectGroup {
  type: string;
  projects: Project[];
}

export const portfolioProjects: ProjectGroup[] = [
  {
    type: "Web Development",
    projects: [
      {
        name: "SERVE",
        description: "Internship Project. A web-based customer satisfaction and feedback management system for DOST CALABARZON, enabling efficient collection and monitoring of responses for units in the department. Implemented configurable branding, dynamic form creation, analytics dashboards, report generation, and database backup and export capabilities to support flexible and data-driven feedback management.",
        fullResPreviews: ["/projects/serve/1.png", "/projects/serve/2.png"],
        previews: ["/projects/serve/1.png", "/projects/serve/2.png"],
        date: "May 2026",
        skills: ["Vue.js", "Inertia.js", "Laravel", "Tailwind CSS", "MySQL"],
      },
      {
        name: "ThesisFlow",
        description: "Best Research Paper Award. An NLP and TF-IDF Enabled Web-based Research Management System with Adviser Recommendation. A centralized research management system for the Colegio de San Juan de Letran Calamba’s Student Research Unit (SRU), featuring centralized thesis submissions, progress tracking, and adviser matching, among other workflow tools that reduced manual coordination.",
        fullResPreviews: ["/projects/thesisflow.png"],
        previews: ["/projects/thesisflow-webgl.webp"],
        date: "January 2026",
        skills: ["React", "TypeScript", "Node.js"],
        link: "https://github.com/Jed556/ThesisFlow"
      }
    ]
  },
  {
    type: "Application Development",
    projects: [
      {
        name: "AMP: Auto MIDI Player",
        description: "Hobby Project. A .NET desktop application using C# and WPF featuring a modern Spotify-inspired interface for playing MIDI files in in-game instruments in Genshin Impact, Sky:CotL, Roblox, Heartopia, and other games. Supports MIDI file parsing, real-time MIDI track playback, note transpositions, and various customizations to enable both direct MIDI playback and automated in-game key simulation.",
        fullResPreviews: ["/projects/amp.png"],
        previews: ["/projects/amp-webgl.webp"],
        date: "January 2026",
        skills: ["C#", "WPF", "SQLite"],
        link: "https://github.com/Jed556/AutoMidiPlayer"
      },
      {
        name: "Apollø",
        description: "Apollø is a JavaScript based Discord bot that runs on [discord.js](https://github.com/discordjs/discord.js) and [DisTube](https://github.com/skick1234/DisTube). This bot is a reworked and improved version of [JavaSkripp](https://github.com/Jed556/JavaSkripp-DEPRECATED) - from scratch. Apollø supports music, utility, entertainment and moderation commands.",
        fullResPreviews: ["/projects/apollo.png"],
        previews: ["/projects/apollo-webgl.webp"],
        date: "17.06.2022",
        skills: ["JavaScript", "MongoDB", "Shell", "GCP"],
        link: "https://github.com/Jed556/Apollo"
      }
    ]
  },
  {
    type: "Internet of Things",
    projects: [
      {
        name: "QuieTrack",
        description: "Practical Project Requirement Prototype. An IoT-based noise monitoring system using ESP32 with online local web configuration dashboard, a LMV358-based Sound Sensor to track noise levels, and an OLED display for on-device visualization. The web dashboard is integrated with Firebase to display live noise data and historical trends for remote monitoring.",
        fullResPreviews: ["/projects/quietrack.png"],
        previews: ["/projects/quietrack-webgl.webp"],
        date: "January 2025",
        skills: ["ESP32", "Firebase", "C++", "IoT"],
        link: "https://github.com/Jed556/QuieTrack"
      },
      {
        name: "AtmosClear",
        description: "DOST Hack4AProgress '24 Prototype. An IoT-based air quality monitoring and HEPA-based filtration control system using ESP32, integrating PM2.5, gas, temperature, and humidity sensors with real-time data updates to an online web dashboard. The web-enabled environmental monitoring solution features historical air quality analytics, and alert notifications.",
        fullResPreviews: ["/projects/atmosclear.png"],
        previews: ["/projects/atmosclear-webgl.webp"],
        date: "September 2024",
        skills: ["React", "PHP", "Arduino IDE", "VS Code"],
        link: "https://github.com/Jed556/AtmosClear"
      }
    ]
  },
  {
    type: "3D & Video Editing",
    projects: [
      {
        name: "SCIE",
        description: "Video for SCST and STIKI (Malang, Indonesia) partnership.",
        previews: ["https://img.youtube.com/vi/k-rg02w5kOo/maxresdefault.jpg"],
        date: "23.08.2024",
        skills: ["After Effects"],
        link: "https://www.youtube.com/watch?v=k-rg02w5kOo"
      },
      {
        name: "Vibes - Chase Atlantic",
        description: "Music video edit for Vibes by Chase Atlantic.",
        previews: ["https://img.youtube.com/vi/SHSJABMbwXE/maxresdefault.jpg"],
        date: "16.08.2024",
        skills: ["After Effects", "Photoshop"],
        link: "https://www.youtube.com/watch?v=SHSJABMbwXE"
      },
      {
        name: "AI Campaign",
        description: "Promotional video about the partnership between Rinna and Letran Calamba.",
        previews: ["https://img.youtube.com/vi/HXrOJfNNvps/maxresdefault.jpg"],
        date: "06.08.2024",
        skills: ["After Effects"],
        link: "https://www.youtube.com/watch?v=HXrOJfNNvps"
      },
      {
        name: "SCST AVP",
        description: "Audio Visual Presentation for SCST.",
        previews: ["https://img.youtube.com/vi/KWNETSwM9eQ/maxresdefault.jpg"],
        date: "22.07.2024",
        skills: ["After Effects"],
        link: "https://www.youtube.com/watch?v=KWNETSwM9eQ"
      },
      {
        name: "SCST Ball 2024 Tribute",
        description: "A heartfelt tribute video for graduating students.",
        previews: ["https://img.youtube.com/vi/crsumntvkYQ/maxresdefault.jpg"],
        date: "17.05.2024",
        skills: ["After Effects"],
        link: "https://www.youtube.com/watch?v=crsumntvkYQ"
      },
      {
        name: "Battle of the Bands 2024",
        description: "Teaser, Registration promo, and Background visuals for Battle of the Bands 2024.",
        previews: [
          "https://img.youtube.com/vi/iFuHqODr4qw/maxresdefault.jpg",
          "https://img.youtube.com/vi/F3N1nA8yB6Y/maxresdefault.jpg",
          "https://img.youtube.com/vi/XWSMWXuMjAQ/maxresdefault.jpg"
        ],
        date: "17.03.2024",
        skills: ["Blender", "After Effects"],
        link: "https://www.youtube.com/watch?v=iFuHqODr4qw"
      },
      {
        name: "Lycoris Recoil",
        description: "Chisato AMV.",
        previews: ["https://img.youtube.com/vi/_i7r4uqqe8Y/maxresdefault.jpg"],
        date: "11.01.2024",
        skills: ["Blender", "After Effects", "Illustrator"],
        link: "https://www.youtube.com/watch?v=_i7r4uqqe8Y"
      },
      {
        name: "Hibike Euphonium",
        description: "Hibike Euphonium AMV.",
        previews: ["https://img.youtube.com/vi/pe5ZgQmZV80/maxresdefault.jpg"],
        date: "01.01.2024",
        skills: ["After Effects"],
        link: "https://www.youtube.com/watch?v=pe5ZgQmZV80"
      }
    ]
  },
  {
    type: "Graphic Design",
    projects: [
      {
        name: "BECP",
        description: "Blockchain Education Consortium of the Philippines Laguna (BECP) logo design.",
        fullResPreviews: ["/projects/becp.jpg"],
        previews: ["/projects/becp-webgl.webp"],
        date: "29.10.2024",
        skills: ["Illustrator"]
      },
      {
        name: "Birthday Invitation",
        description: "Custom invitation card design.",
        fullResPreviews: ["/projects/invitation-ysha/1.png", "/projects/invitation-ysha/2.png", "/projects/invitation-ysha/3.png", "/projects/invitation-ysha/4.png"],
        previews: ["/projects/invitation-ysha/1-webgl.webp", "/projects/invitation-ysha/2-webgl.webp", "/projects/invitation-ysha/3-webgl.webp", "/projects/invitation-ysha/4-webgl.webp"],
        date: "25.10.2024",
        skills: ["Photoshop", "Illustrator"]
      },
      {
        name: "Intramurals 2025",
        description: "Sports category shirt designs for Intramurals 2025.",
        fullResPreviews: [
          "/projects/intrams25/Badminton-TableTennis Front.png",
          "/projects/intrams25/Badminton-TableTennis Back.png",
          "/projects/intrams25/ESports-BoardGames Front.png",
          "/projects/intrams25/ESports-BoardGames Back.png"
        ],
        previews: [
          "/projects/intrams25/Badminton-TableTennis Front-webgl.webp",
          "/projects/intrams25/Badminton-TableTennis Back-webgl.webp",
          "/projects/intrams25/ESports-BoardGames Front-webgl.webp",
          "/projects/intrams25/ESports-BoardGames Back-webgl.webp"
        ],
        date: "23.04.2024",
        skills: ["Photoshop", "Illustrator"]
      },
      {
        name: "Intramurals 2024",
        description: "Graphic design and promotional material for Intramurals 2024.",
        fullResPreviews: ["/projects/intrams24/intrams24.png", "/projects/intrams24/Compiled.png"],
        previews: ["/projects/intrams24/intrams24-webgl.webp", "/projects/intrams24/Compiled-webgl.webp"],
        date: "15.04.2024",
        skills: [["Canva"], ["Photoshop", "Illustrator"]]
      },
      {
        name: "Battle of the Bands Pubmat",
        description: "Publication material for Battle of the Bands 2024.",
        fullResPreviews: ["/projects/botb24/botb24-opening.png", "/projects/botb24/botb24.png", "/projects/botb24/botb24-closing.png"],
        previews: ["/projects/botb24/botb24-opening-webgl.webp", "/projects/botb24/botb24-webgl.webp", "/projects/botb24/botb24-closing-webgl.webp"],
        date: "17.03.2024",
        skills: [["Illustrator"], ["Illustrator"], ["Illustrator"]]
      },
      {
        name: "Mr. & Ms.",
        description: "Promotional graphics for the Mr. and Ms. pageant.",
        fullResPreviews: ["/projects/mr-ms.png"],
        previews: ["/projects/mr-ms-webgl.webp"],
        date: "01.02.2024",
        skills: ["Canva"]
      },
      {
        name: "USB Productions",
        description: "Custom USB graphics and design.",
        fullResPreviews: ["/projects/usb/usb-1-s.png", "/projects/usb/usb-1.png", "/projects/usb/usb-2-s.png", "/projects/usb/usb-2.png", "/projects/usb/usb-3-s.png", "/projects/usb/usb-3.png"],
        previews: ["/projects/usb/usb-1-s-webgl.webp", "/projects/usb/usb-1-webgl.webp", "/projects/usb/usb-2-s-webgl.webp", "/projects/usb/usb-2-webgl.webp", "/projects/usb/usb-3-s-webgl.webp", "/projects/usb/usb-3-webgl.webp"],
        date: "26.11.2023",
        skills: ["Photoshop", "Illustrator"]
      },
      {
        name: "Openhouse 2023-2024",
        description: "Openhouse event promotional graphics.",
        fullResPreviews: ["/projects/openhouse23-24/openhouse-f.png", "/projects/openhouse23-24/openhouse-b.png"],
        previews: ["/projects/openhouse23-24/openhouse-f-webgl.webp", "/projects/openhouse23-24/openhouse-b-webgl.webp"],
        date: "07.06.2023",
        skills: ["Illustrator"]
      },
      {
        name: "Shirt Vote",
        description: "Design for the shirt voting campaign.",
        fullResPreviews: ["/projects/shirt-vote.png"],
        previews: ["/projects/shirt-vote-webgl.webp"],
        date: "16.03.2023",
        skills: ["Illustrator"]
      },
      {
        name: "Plagg",
        description: "Plagg character graphic design.",
        fullResPreviews: ["/projects/plagg.png"],
        previews: ["/projects/plagg-webgl.webp"],
        date: "17.08.2022",
        skills: ["Illustrator"]
      },
      {
        name: "Milktea-Sha",
        description: "MTS graphical poster.",
        fullResPreviews: ["/projects/mts.png"],
        previews: ["/projects/mts-webgl.webp"],
        date: "30.11.2021",
        skills: ["Blender", "Illustrator"]
      }
    ]
  }
];

export const SCROLL_NORMAL_SPACING = 0.9;
export const SCROLL_GROUP_SPACING = 1.8;

export interface FlatProject extends Project {
  groupType: string;
  scrollOffset: number;
  isFirstInGroup: boolean;
  flatIndex: number;
}

export const flatProjects: FlatProject[] = [];
let currentScrollOffset = 0;
let fIdx = 0;

portfolioProjects.forEach((group, gIndex) => {
  group.projects.forEach((proj, pIndex) => {
    if (pIndex === 0 && gIndex !== 0) {
      currentScrollOffset += SCROLL_GROUP_SPACING;
    } else if (pIndex !== 0) {
      currentScrollOffset += SCROLL_NORMAL_SPACING;
    }

    flatProjects.push({
      ...proj,
      groupType: group.type,
      scrollOffset: currentScrollOffset, // Initial dummy offsets
      isFirstInGroup: pIndex === 0,
      flatIndex: fIdx++
    });
  });
});

export const MAX_SCROLL = currentScrollOffset + SCROLL_GROUP_SPACING;
