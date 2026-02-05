import ChatInterface from "./ChatInterface";

export default function Home() {
  const apiKey = process.env.API_KEY || "";

  return <ChatInterface apiKey={apiKey} />;
}
