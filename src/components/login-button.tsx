"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginButton() {
  return (
    <Button
      onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
      className="w-full bg-[#004d33] hover:bg-[#49624e] text-white py-3 text-base"
      size="lg"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
        <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
        <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
        <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
      </svg>
      Entrar com Microsoft
    </Button>
  );
}
