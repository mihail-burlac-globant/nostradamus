/* eslint-disable react-refresh/only-export-components */
export interface ResourceIcon {
  id: string
  name: string
  component: React.FC<{ className?: string }>
}

// Generic/Default Icon
const GenericIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
)

// Frontend Technologies
const ReactIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68s-1.83 2.93-4.37 3.68c.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68s1.83-2.93 4.37-3.68c-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26 0-.73-1.18-1.63-3.28-2.26-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26 0 .73 1.18 1.63 3.28 2.26.25-.76.55-1.51.89-2.26m9.9 2.91c.36.61.64 1.15.82 1.58-.08-.12-.17-.27-.28-.43-.41-.73-.88-1.5-1.34-2.29.29.61.54 1.12.8 1.14m-9.82-5.82c-.36-.61-.64-1.15-.82-1.58.08.12.17.27.28.43.41.73.88 1.5 1.34 2.29-.29-.61-.54-1.12-.8-1.14z" />
  </svg>
)

const VueIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 3h3.5L12 15l6.5-12H22L12 21 2 3m4.5 0h3L12 7.58 14.5 3h3L12 13.08 6.5 3z" />
  </svg>
)

const AngularIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.5L20.84 5.65l-1.34 11.48L12 21.5l-7.5-4.37-1.34-11.48L12 2.5m0 2.14L6.47 17h2.06l1.11-2.78h4.7L15.45 17h2.06L12 4.64M12 8.47l1.77 4.42h-3.54L12 8.47z" />
  </svg>
)

// Backend Technologies
const NodeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1.85c-.27 0-.55.07-.78.2l-7.44 4.3c-.48.28-.78.8-.78 1.36v8.58c0 .56.3 1.08.78 1.36l1.95 1.12c.95.46 1.27.47 1.71.47 1.4 0 2.21-.85 2.21-2.33V8.44c0-.12-.1-.22-.22-.22H8.5c-.13 0-.23.1-.23.22v8.47c0 .66-.68 1.31-1.77.76L4.45 16.5a.26.26 0 01-.11-.21V7.71c0-.09.04-.17.11-.21l7.44-4.29c.06-.04.16-.04.22 0l7.44 4.29c.07.04.11.12.11.21v8.58c0 .08-.04.16-.11.21l-7.44 4.29c-.06.04-.16.04-.22 0L10 19.65c-.08-.03-.16-.04-.21-.01-.53.3-.63.36-1.12.51-.12.04-.31.11.07.32l2.48 1.47c.24.14.5.21.77.21s.53-.07.77-.21l7.44-4.29c.48-.28.78-.8.78-1.36V7.71c0-.56-.3-1.08-.78-1.36l-7.44-4.3c-.23-.13-.5-.2-.77-.2M14 8c-2.12 0-3.39.89-3.39 2.39 0 1.61 1.26 2.08 3.3 2.28 2.43.24 2.62.6 2.62 1.08 0 .83-.67 1.18-2.23 1.18-1.98 0-2.4-.49-2.55-1.47a.226.226 0 00-.22-.18h-.96c-.12 0-.21.09-.21.22 0 1.24.68 2.74 3.94 2.74 2.35 0 3.7-.93 3.7-2.55 0-1.61-1.08-2.03-3.37-2.34-2.31-.3-2.54-.46-2.54-1 0-.45.2-1.05 1.91-1.05 1.5 0 2.09.33 2.32 1.36.02.1.11.17.21.17h.97c.05 0 .11-.02.15-.07.04-.04.07-.1.05-.16C17.56 8.82 16.38 8 14 8z" />
  </svg>
)

const PythonIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.585 11.692h4.328s2.432.039 2.432-2.35V5.391S16.714 3 11.936 3C7.362 3 7.647 3 7.647 3l-.004 2.35h4.363v.617H5.92s-2.927-.332-2.927 4.282 2.555 4.45 2.555 4.45h1.524v-2.141s-.083-2.554 2.513-2.554zm-.056-5.74a.784.784 0 1 1 0-1.57.784.784 0 0 1 0 1.57zM11.936 21c4.574 0 4.289 0 4.289 0l.01-2.35h-4.363v-.617h6.085s2.927.332 2.927-4.282-2.555-4.45-2.555-4.45h-1.524v2.141s.083 2.554-2.513 2.554h-4.328s-2.432-.04-2.432 2.35v3.951S7.163 21 11.94 21zm.056-2.35a.784.784 0 1 1 0 1.57.784.784 0 0 1 0-1.57z" />
  </svg>
)

const JavaIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0-.001-8.216 2.051-4.292 6.573M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.355.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.928 4.562 0-.001.07-.062.09-.118M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.888 4.832-.001 6.836-2.274-2.053-3.943-3.858-2.824-5.539 1.644-2.469 6.197-3.665 5.19-7.627M9.734 23.924c4.322.277 10.959-.153 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0-.001.553.457 3.393.639" />
  </svg>
)

const PHPIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <ellipse cx="12" cy="12" rx="11" ry="6.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M4.5 10.5h1.8c.9 0 1.4.6 1.4 1.3 0 .8-.6 1.3-1.5 1.3H5.3l-.3 1.4H4l1-4zm.8 2h.5c.4 0 .7-.2.7-.6 0-.3-.2-.5-.6-.5h-.5l-.3 1.1zM9.5 10.5h1l-.4 1.8h.9c.6 0 .9-.3 1-.9l.3-1h1l-.3 1c-.2 1-.8 1.5-1.8 1.5h-.9l-.4 1.6h-1l1-4zM14.5 10.5h1.8c.9 0 1.4.6 1.4 1.3 0 .8-.6 1.3-1.5 1.3h-.9l-.3 1.4h-1l1-4zm.8 2h.5c.4 0 .7-.2.7-.6 0-.3-.2-.5-.6-.5h-.5l-.3 1.1z"/>
  </svg>
)

// Mobile
const iOSIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
)

const AndroidIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.61 15.15c-.46 0-.84.38-.84.84s.38.84.84.84.84-.38.84-.84-.38-.84-.84-.84M7.41 15.15c-.46 0-.84.38-.84.84s.38.84.84.84.84-.38.84-.84-.38-.84-.84-.84M16.91 3.58l1.43-2.47c.09-.15.03-.35-.12-.44-.15-.09-.35-.04-.44.11l-1.46 2.52C14.68 2.44 13.39 2 12 2s-2.68.44-4.32 1.3L6.22.78c-.09-.15-.29-.2-.44-.11-.15.09-.21.29-.12.44l1.43 2.47C4.87 4.82 3 7.18 3 10h18c0-2.82-1.87-5.18-4.09-6.42M9.4 7.62c-.45 0-.82-.37-.82-.82 0-.46.37-.82.82-.82.46 0 .82.36.82.82 0 .45-.36.82-.82.82m5.2 0c-.45 0-.82-.37-.82-.82 0-.46.37-.82.82-.82.46 0 .82.36.82.82 0 .45-.36.82-.82.82M3 11v8c0 .55.45 1 1 1h1v3c0 .8.68 1.5 1.5 1.5S8 23.8 8 23v-3h8v3c0 .8.68 1.5 1.5 1.5s1.5-.7 1.5-1.5v-3h1c.55 0 1-.45 1-1v-8H3z" />
  </svg>
)

// Database & Infrastructure
const DatabaseIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 2 4 8 4s8-2 8-4V7M4 7c0 2 2 4 8 4s8-2 8-4M4 7c0-2 2-4 8-4s8 2 8 4m0 5c0 2-2 4-8 4s-8-2-8-4" />
  </svg>
)

const CloudIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
)

const ServerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
)

const DockerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5">
    {/* Container blocks - 3 rows of boxes */}
    <rect x="5" y="6" width="2.5" height="2" rx="0.3"/>
    <rect x="8" y="6" width="2.5" height="2" rx="0.3"/>
    <rect x="11" y="6" width="2.5" height="2" rx="0.3"/>

    <rect x="8" y="3.5" width="2.5" height="2" rx="0.3"/>
    <rect x="11" y="3.5" width="2.5" height="2" rx="0.3"/>

    <rect x="11" y="8.5" width="2.5" height="2" rx="0.3"/>
    <rect x="14" y="8.5" width="2.5" height="2" rx="0.3"/>

    {/* Whale body - simplified whale shape */}
    <path d="M2 13.5 C2 12, 4 11, 7 11 L17 11 C19 11, 21 11.5, 22 13 C22.5 14, 22 15, 20.5 15.5 C19.5 16, 18 16, 16 15.5 C14 15, 4 15, 2.5 14.5 C1.5 14.2, 1.5 14, 2 13.5 Z" strokeWidth="0"/>

    {/* Whale tail */}
    <path d="M20.5 15 Q21.5 16, 22 17 Q22.5 18, 21.5 18.5 Q20.5 19, 20 17.5 Z" strokeWidth="0"/>

    {/* Whale eye */}
    <circle cx="5" cy="13" r="0.6" fill="white" stroke="none"/>
  </svg>
)

const DotNetIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    {/* Hexagon background */}
    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter"/>
    {/* .NET text */}
    <text x="12" y="14" fontSize="7" fontWeight="bold" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif">.NET</text>
  </svg>
)

// DevOps & Tools
const GitIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.62 11.108l-8.731-8.729a1.292 1.292 0 00-1.823 0L9.257 4.19l2.299 2.3a1.532 1.532 0 011.939 1.95l2.214 2.217a1.53 1.53 0 011.583 2.531c-.599.6-1.566.6-2.166 0a1.536 1.536 0 01-.337-1.662l-2.074-2.063V14.9c.146.071.286.169.407.29a1.537 1.537 0 010 2.166 1.536 1.536 0 01-2.174 0 1.528 1.528 0 010-2.164c.152-.15.322-.264.504-.339v-5.49a1.529 1.529 0 01-.83-2.008l-2.26-2.271-5.987 5.982c-.5.504-.5 1.32 0 1.824l8.731 8.729a1.286 1.286 0 001.821 0l8.69-8.689a1.284 1.284 0 000-1.821" />
  </svg>
)

const KubernetesIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.204 14.35l.007.01-.999 2.413a5.171 5.171 0 0 1-2.075-2.597l2.578-.437.004.005a.44.44 0 0 1 .484.606zm-.833-2.129a.44.44 0 0 0 .173-.756l.002-.011L7.585 9.7a5.143 5.143 0 0 0-.73 3.255l2.514-.725.002-.009zm1.145-1.98a.44.44 0 0 0 .699-.337l.01-.005.15-2.62a5.144 5.144 0 0 0-3.01 1.442l2.147 1.523.004-.002zm.76 2.75l.723.349.722-.347.18-.78-.5-.623h-.804l-.5.623.179.779zm1.5-3.095a.44.44 0 0 0 .7.336l.008.003 2.134-1.513a5.188 5.188 0 0 0-2.992-1.442l.148 2.615.002.001zm10.876 5.97l-5.773 7.181a1.6 1.6 0 0 1-1.248.594l-9.261.003a1.6 1.6 0 0 1-1.247-.596l-5.776-7.18a1.583 1.583 0 0 1-.307-1.34L2.1 5.573c.108-.47.425-.864.863-1.073L11.305.513a1.606 1.606 0 0 1 1.385 0l8.345 3.985c.438.209.755.604.863 1.073l2.062 8.955c.108.47-.005.963-.308 1.34zm-3.289-2.057c-.042-.01-.103-.026-.145-.04l-2.186-.764a.425.425 0 0 0-.535.2h-.002l-.98 2.132a5.112 5.112 0 0 0 2.062-3.139l1.784.612.002-.001zm-2.73-2.443a.44.44 0 0 0-.153-.757v-.01l-2.535-.735a5.108 5.108 0 0 0-.744 3.24l2.423-.424.009-.004v-.01zm-3.286-3.312l.005-.006-.139-2.622a5.15 5.15 0 0 0-2.993 1.446l2.117 1.496.002.005a.44.44 0 0 0 .706-.336l.002.017zm-3.046 6.058c-.04.05-.093.116-.134.166l-1.746 1.275a5.113 5.113 0 0 0 3.54.642l-.973-2.252v-.002a.425.425 0 0 0-.687-.111v.282zm8.293-1.894a.44.44 0 0 0-.476-.622l.003-.004-2.596.46-.004.01a5.15 5.15 0 0 0-.728-3.257l2.534.737.007-.009z" />
  </svg>
)

const TypeScriptIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-.643-.361 5.093 5.093 0 00-.717-.26 5.453 5.453 0 00-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 00-.623.242c-.17.104-.3.229-.393.374a.888.888 0 00-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 01-1.012 1.085 4.38 4.38 0 01-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 01-1.84-.164 5.544 5.544 0 01-1.512-.493v-2.63a5.033 5.033 0 003.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 00-.074-1.089 2.12 2.12 0 00-.537-.5 5.597 5.597 0 00-.807-.444 27.72 27.72 0 00-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 011.47-.629 7.536 7.536 0 011.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" />
  </svg>
)

const JavaScriptIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z" />
  </svg>
)

// Design & QA
const DesignIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
)

const TestingIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

// Management & Leadership
const ProjectManagerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
)

const ProductOwnerIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const ArchitectIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const AIIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
)

export const RESOURCE_ICONS: ResourceIcon[] = [
  { id: 'generic', name: 'Generic', component: GenericIcon },
  { id: 'react', name: 'React', component: ReactIcon },
  { id: 'vue', name: 'Vue.js', component: VueIcon },
  { id: 'angular', name: 'Angular', component: AngularIcon },
  { id: 'nodejs', name: 'Node.js', component: NodeIcon },
  { id: 'python', name: 'Python', component: PythonIcon },
  { id: 'java', name: 'Java', component: JavaIcon },
  { id: 'php', name: 'PHP', component: PHPIcon },
  { id: 'dotnet', name: '.NET', component: DotNetIcon },
  { id: 'ios', name: 'iOS', component: iOSIcon },
  { id: 'android', name: 'Android', component: AndroidIcon },
  { id: 'database', name: 'Database', component: DatabaseIcon },
  { id: 'cloud', name: 'Cloud', component: CloudIcon },
  { id: 'server', name: 'Server', component: ServerIcon },
  { id: 'docker', name: 'Docker', component: DockerIcon },
  { id: 'git', name: 'Git', component: GitIcon },
  { id: 'kubernetes', name: 'Kubernetes', component: KubernetesIcon },
  { id: 'typescript', name: 'TypeScript', component: TypeScriptIcon },
  { id: 'javascript', name: 'JavaScript', component: JavaScriptIcon },
  { id: 'design', name: 'Design/UX', component: DesignIcon },
  { id: 'testing', name: 'Testing/QA', component: TestingIcon },
  { id: 'project-manager', name: 'Project Manager', component: ProjectManagerIcon },
  { id: 'product-owner', name: 'Product Owner', component: ProductOwnerIcon },
  { id: 'architect', name: 'Architect', component: ArchitectIcon },
  { id: 'ai', name: 'AI/ML', component: AIIcon },
]

export const getIconById = (id: string): React.FC<{ className?: string }> => {
  const icon = RESOURCE_ICONS.find((i) => i.id === id)
  return icon ? icon.component : GenericIcon
}

export const getDefaultIcon = (): React.FC<{ className?: string }> => GenericIcon
