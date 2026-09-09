import type { AgentId } from "@/lib/agents/types";
import { sourceLabel, type TraceSource } from "@/lib/trace-source";

type MarkSource = TraceSource | AgentId;

interface SourceLogoProps {
  source: MarkSource;
  className?: string;
}

function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  );
}

function GptMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function CursorMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}

export function sourceShortLabel(source: MarkSource): string {
  if (source === "claude-code") return "Claude";
  if (source === "codex") return "GPT";
  if (source === "cursor") return "Cursor";
  if (source === "example") return "Example";
  return sourceLabel(source);
}

function SlackMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M6.5 15.5A2.5 2.5 0 1 1 4 13h2.5v2.5Zm1.25 0A2.5 2.5 0 1 1 10.25 18V8.5A2.5 2.5 0 1 1 7.75 6v9.5ZM8.5 6.5A2.5 2.5 0 1 1 11 4v2.5H8.5Zm0 1.25A2.5 2.5 0 1 1 6 10.25h9.5A2.5 2.5 0 1 1 18 7.75H8.5ZM17.5 8.5A2.5 2.5 0 1 1 20 11h-2.5V8.5Zm-1.25 0A2.5 2.5 0 1 1 13.75 6v9.5a2.5 2.5 0 1 1 2.5 2.5V8.5ZM15.5 17.5A2.5 2.5 0 1 1 13 20v-2.5h2.5Zm0-1.25A2.5 2.5 0 1 1 18 13.75H8.5a2.5 2.5 0 1 1-2.5 2.5h9.5Z" />
    </svg>
  );
}

function KakaoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.82 1.84 5.3 4.62 6.74L5.5 21.5 9.7 18.9c.74.16 1.51.25 2.3.25 5.52 0 10-3.58 10-8.15C22 6.58 17.52 3 12 3Z" />
    </svg>
  );
}

function EmailMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 3.2 8 5.4 8-5.4V7.1L12 12.4 4 7.1V8.2z" />
    </svg>
  );
}

function FilesMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h5.2l1.6 2H19.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
    </svg>
  );
}

function LetterMark({ source, className }: { source: TraceSource; className?: string }) {
  const letter = sourceLabel(source).replace(/[^A-Za-z]/g, "").slice(0, 1) || "?";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[3px] bg-zinc-700/90 text-[9px] font-semibold leading-none ${className}`}
      aria-hidden
    >
      {letter}
    </span>
  );
}

function GitLabMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 21.2 16.4 8.1h-8.8L12 21.2ZM1.3 14.3 12 21.2 2.8 8.1 1.1 13.2a.7.7 0 0 0 .2 1.1ZM21.7 13.2 20 8.1 12 21.2l10.7-6.9a.7.7 0 0 0 .2-1.1ZM16.4 8.1 14.5 2.4a.5.5 0 0 0-1 0L12 6.9 16.4 8.1ZM9.5 2.4a.5.5 0 0 0-1 0L6.6 8.1 11 6.9 9.5 2.4Z" />
    </svg>
  );
}

function GiteaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M4 13.5c0-4.2 3.6-7.5 8-7.5 3.2 0 6 1.8 7.2 4.4.6-.2 1.3-.1 1.8.3s.7 1.2.5 1.9c1 .9 1.5 2.1 1.5 3.4 0 2.8-2.5 5-5.6 5H8.6C5.5 21 3 18.8 3 16c0-.9.2-1.8.7-2.5H4Zm8-5.5c-3.3 0-6 2.5-6 5.5S8.7 19 12 19s6-2.5 6-5.5S15.3 8 12 8Zm-1.2 3.2h2.4v5.1h-2.4V11.2Zm0-2.3h2.4V10h-2.4V8.9Z" />
    </svg>
  );
}

function MattermostMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3 4.2 7.5v9L12 21l7.8-4.5v-9L12 3Zm0 2.3 5.6 3.2v.9L12 12.6 6.4 9.4v-.9L12 5.3Zm-5.6 5.4 5.1 2.9v5.2L6.4 16V10.7Zm6.1 8.1v-5.2l5.1-2.9V16l-5.1 2.8Z" />
    </svg>
  );
}

function RocketChatMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3c4.4 0 8 3 8 6.8 0 2.4-1.4 4.5-3.6 5.7L18 21l-4.2-2.4c-.6.1-1.2.2-1.8.2-4.4 0-8-3-8-6.8S7.6 3 12 3Zm-2.2 5.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm2.2 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm2.2 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z" />
    </svg>
  );
}

function ZulipMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M5 5.5h14l-8 6.5H19v6.5H5l8-6.5H5V5.5Z" />
    </svg>
  );
}

function MatrixMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M4 4h2.2v16H4V4Zm13.8 0H20v16h-2.2V4ZM8.2 7.2h2.1v9.6H8.2V7.2Zm5.5 0h2.1v9.6h-2.1V7.2Z" />
    </svg>
  );
}

function OutlineMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M7 3h8l5 5v13H7V3Zm8 1.8V8h3.2L15 4.8ZM9 11h8v1.5H9V11Zm0 3h8v1.5H9V14Zm0 3h5.5V18.5H9V17Z" />
    </svg>
  );
}

function DiscourseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3a9 9 0 0 0-9 9c0 1.4.3 2.7.9 3.9L3 21l5.3-1.4A9 9 0 1 0 12 3Zm-3.4 5.2h6.8v2.1l-4.2 3.4 4.2.1v2.1H8.6v-2.1l4.2-3.4-4.2-.1V8.2Z" />
    </svg>
  );
}

function PlaneMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M3.2 11.1 21 3.5 14.2 21l-3.3-6.2L3.2 11.1Zm5.7.8 4.1 2.2 1.6 3.1 3.4-8.7-9.1 3.4Z" />
    </svg>
  );
}

function OpenProjectMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M5 4h14v3.2H5V4Zm0 6.4h9.5V13.6H5V10.4Zm0 6.4h14V20H5v-3.2Z" />
    </svg>
  );
}

function BookStackMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M5 4h6.2v16H6.2A1.2 1.2 0 0 1 5 18.8V4Zm8 0h6.2v14.8A1.2 1.2 0 0 1 18 20h-5V4Z" />
    </svg>
  );
}

function TaigaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3 4 8.2v7.6L12 21l8-5.2V8.2L12 3Zm0 2.4 5.6 3.6v.9L12 13.4 6.4 9.9v-.9L12 5.4Z" />
    </svg>
  );
}

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function SourceLogo({ source, className = "h-3.5 w-3.5" }: SourceLogoProps) {
  if (source === "claude-code") return <ClaudeMark className={className} />;
  if (source === "codex") return <GptMark className={className} />;
  if (source === "cursor") return <CursorMark className={className} />;
  if (source === "slack") return <SlackMark className={className} />;
  if (source === "kakao") return <KakaoMark className={className} />;
  if (source === "email") return <EmailMark className={className} />;
  if (source === "files") return <FilesMark className={className} />;
  if (source === "github") return <GitHubMark className={className} />;
  if (source === "gitlab") return <GitLabMark className={className} />;
  if (source === "gitea") return <GiteaMark className={className} />;
  if (source === "mattermost") return <MattermostMark className={className} />;
  if (source === "rocketchat") return <RocketChatMark className={className} />;
  if (source === "zulip") return <ZulipMark className={className} />;
  if (source === "matrix") return <MatrixMark className={className} />;
  if (source === "outline") return <OutlineMark className={className} />;
  if (source === "discourse") return <DiscourseMark className={className} />;
  if (source === "plane") return <PlaneMark className={className} />;
  if (source === "openproject") return <OpenProjectMark className={className} />;
  if (source === "bookstack") return <BookStackMark className={className} />;
  if (source === "taiga") return <TaigaMark className={className} />;
  return <LetterMark source={source} className={className} />;
}
