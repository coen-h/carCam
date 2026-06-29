'use client';

import { useState } from "react";
import Header from "@/app/components/Header";
import Background from "@/app/components/Background";
import { Shield, Eye, Database, Clock, Lock, UserCheck, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  const [isdark, setIsdarkCom] = useState<boolean | null>(null);

  return (
    <div className='w-full h-dvh flex flex-col bg-base-100 overflow-hidden'>
      <Background />
      <Header setIsDarkCom={setIsdarkCom} />
      
      <div className="container overflow-y-scroll mx-auto max-w-3xl max-md:max-w-3xl w-full p-2 flex-1 max-md:flex max-md:flex-col min-h-0">
        <div className='flex-1 max-md:mb-14 backdrop-blur-md min-h-0 text-base-content bg-base-200 shadow-2xl border border-base-200 rounded-box p-4 max-md:p-4 overflow-y-auto flex flex-col gap-4'>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Shield className="size-8" />
              </div>
              <div>
                <h1 className='text-3xl font-bold tracking-tight'>Privacy Policy</h1>
                <p className='text-sm text-base-content/60 font-medium tracking-wide uppercase mt-1'>carCam System</p>
              </div>
            </div>
            <p className='mt-4 text-xs text-base-content/50 font-medium'>Effective Date: June 29, 2026</p>
          </div>

          <p className="text-base-content/80 text-sm leading-relaxed">
            Welcome to carCam. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the carCam system and website to access the school parking lot.
          </p>

          <div className="flex flex-col gap-4">
            <div className="bg-base-100 border border-base-300 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-base-content">
                <Eye className="size-5 text-primary" />
                1. Information We Collect
              </h2>
              <ul className="list-disc list-inside text-sm text-base-content/70 space-y-2 ml-1">
                <li><strong className="text-base-content">Account Information:</strong> Name and school email address (via Google login).</li>
                <li><strong className="text-base-content">Vehicle Details:</strong> License plate number, make, and model.</li>
                <li><strong className="text-base-content">Surveillance Data:</strong> Images/video clips of your vehicle, 3D depth maps, AI-extracted data (License Plate OCR), and timestamped logs.</li>
              </ul>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-base-content">
                <UserCheck className="size-5 text-primary" />
                2. How We Use Your Information
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed mb-2">
                Your data is used strictly for school safety, accountability, and parking lot management. Specifically, to:
              </p>
              <ul className="list-disc list-inside text-sm text-base-content/70 space-y-1 ml-1">
                <li>Verify if your vehicle is authorized to park on grounds.</li>
                <li>Deter property damage and provide a secure timeline of events.</li>
                <li>Notify authorized staff of unregistered or unknown vehicles.</li>
                <li>Allow you to track your own entry and exit logs transparently.</li>
              </ul>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-base-content">
                <Database className="size-5 text-primary" />
                3. Data Storage and Processing
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed">
                Initial image processing is handled securely on local edge hardware (Jetson Nano/Xavier AGX). As a backup, images may be securely transmitted to Google Cloud AI Vision. Your account information, vehicle details, and entry logs are stored securely in a real-time database (ConvexDB).
              </p>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-base-content relative z-10">
                <Clock className="size-5 text-primary" />
                4. Data Retention (The 2-Week Rule)
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed relative z-10">
                We only keep your surveillance data for as long as it is absolutely necessary. <strong className="text-base-content">All captured images, videos, and specific entry/exit logs are automatically and permanently deleted from our database after two (2) weeks.</strong> Your basic profile and vehicle registration details remain active for the school year to grant continuous access.
              </p>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-base-content">
                <Lock className="size-5 text-primary" />
                5. Who Has Access
              </h2>
              <ul className="list-disc list-inside text-sm text-base-content/70 space-y-2 ml-1">
                <li><strong className="text-base-content">You:</strong> Transparent access to your own logs via the Student Dashboard.</li>
                <li><strong className="text-base-content">Authorized Staff:</strong> Designated administrators can view feeds, logs, and alerts.</li>
                <li><strong className="text-base-content">Third Parties:</strong> We do not sell or trade your data. It is only shared with secure infrastructure providers strictly to run the system.</li>
              </ul>
            </div>

            <div className="bg-base-100 border border-base-300 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-3 text-base-content">
                <Mail className="size-5 text-primary" />
                6. Your Rights & Contact
              </h2>
              <p className="text-sm text-base-content/70 leading-relaxed">
                You have the right to review, edit, or request the complete deletion of your account and vehicle data from the system at any time. If you have any questions or feedback regarding this policy, please speak with school administration or the developer, Coen Hitchcock.
              </p>
            </div>
          </div>
          
          <div className="text-center pt-4 pb-2">
            <p className="text-xs text-base-content/40 font-medium">
              &copy; {new Date().getFullYear()} carCam. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}