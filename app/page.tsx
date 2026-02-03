"use client";
import { useState } from "react";

type Message = {
  sender: "scammer" | "user";
  text: string;
  timestamp: string;
};

type APIResponse = {
  status: string;
  reply: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isLoading, setIsLoading] = useState(false);

  const handleUserMessageSubmit = (
    e: React.SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const message = formData.get("message") as string;
    if (message.trim() === "") return;
    const newMessage: Message = {
      sender: "user",
      text: message,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newMessage]);
    (e.currentTarget as HTMLFormElement).reset();
  };

  const handleScammerMessageSubmit = async (
    e: React.SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const messageText = formData.get("message") as string;
    if (messageText.trim() === "") return;

    const newMessage: Message = {
      sender: "scammer",
      text: messageText,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    (e.currentTarget as HTMLFormElement).reset();

    setIsLoading(true);
    try {
      const response = await fetch("/api/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: newMessage,
          conversationHistory: updatedMessages,
          metadata: {
            channel: "web",
            language: "en",
            locale: "en-IN",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: APIResponse = await response.json();

      setMessages((prev) => [...prev, {
        sender: "user",
        text: data.reply,
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-3xl mx-auto gap-4 p-8">
      <form
        onSubmit={handleScammerMessageSubmit}
        className="flex relative outline outline-gray-800 rounded-full group focus-within:outline-white"
      >
        <small className="absolute -top-2.5 left-4 text-gray-600 group-focus-within:text-white uppercase bg-background px-2">
          Scammer
        </small>
        <input
          name="message"
          disabled={isLoading}
          className="flex-1 rounded-full focus:outline-0 rounded-r-none p-2 px-4"
        />
        <button 
          disabled={isLoading}
          className="bg-red-900 p-2 rounded-full px-6 rounded-l-none uppercase text-xs disabled:opacity-50"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </form>
      
      <div className="flex-1 flex flex-col max-w-xs mx-auto w-full gap-2 outline outline-gray-800 rounded-3xl p-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-2 px-4 max-w-xs rounded-xl ${message.sender === "user" ? "bg-blue-900 text-white self-end" : "bg-red-900 text-white self-start"}`}
          >
            <p className="text-sm">{message.text}</p>
          </div>
        ))}
      </div>
      
      <form
        onSubmit={handleUserMessageSubmit}
        className="flex relative outline outline-gray-800 rounded-full group focus-within:outline-white"
      >
        <small className="absolute text-gray-600 -top-2.5 left-4 group-focus-within:text-white uppercase bg-background px-2">
          User
        </small>
        <input
          name="message"
          className="flex-1 rounded-full focus:outline-0 rounded-r-none p-2 px-4"
        />
        <button className="bg-blue-900 p-2 rounded-full px-6 rounded-l-none uppercase text-xs">
          Send
        </button>
      </form>
    </div>
  );
}
