'use client';
import { useEffect } from 'react';
import { VERTICALS } from '@/data/verticals';
import { registerServiceWorker } from '@/lib/pwa';

import { Nav } from '@/components/sections/Nav';
import { Hero } from '@/components/sections/Hero';
import { RatesTicker } from '@/components/sections/RatesTicker';
import { Reach } from '@/components/sections/Reach';
import { AgentTerminal } from '@/components/sections/AgentTerminal';
import { GoalSelector } from '@/components/sections/GoalSelector';
import { Corridors } from '@/components/sections/Corridors';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Stablecoins } from '@/components/sections/Stablecoins';
import { VerticalSection } from '@/components/sections/VerticalSection';
import { Multichain } from '@/components/sections/Multichain';
import { Videos } from '@/components/sections/Videos';
import { Humans } from '@/components/sections/Humans';
import { Extras } from '@/components/sections/Extras';
import { Rewards } from '@/components/sections/Rewards';
import { LiveStats } from '@/components/sections/LiveStats';
import { Testimonials } from '@/components/sections/Testimonials';
import { Pricing } from '@/components/sections/Pricing';
import { Roadmap } from '@/components/sections/Roadmap';
import { Faq } from '@/components/sections/Faq';
import { DownloadApp } from '@/components/sections/DownloadApp';
import { FinalCTA } from '@/components/sections/FinalCTA';
import { Footer } from '@/components/sections/Footer';
import { ScrollNav } from '@/components/ui/ScrollNav';

export default function Home() {
  useEffect(() => { registerServiceWorker(); }, []);

  const [spending, trading, staking] = VERTICALS;

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <RatesTicker />
        <GoalSelector />
        <Corridors />
        <HowItWorks />
        <Stablecoins />

        <VerticalSection v={spending} tone="base" />
        <VerticalSection v={trading} tone="warm" />
        <AgentTerminal />
        <VerticalSection v={staking} tone="base" />

        <Reach />
        <Multichain />
        <Videos />
        <Humans />
        <Extras />
        <Rewards />
        <LiveStats />
        <Testimonials />
        <Pricing />
        <Roadmap />
        <Faq />
        <DownloadApp />
        <FinalCTA />
      </main>
      <Footer />
      <ScrollNav />
    </>
  );
}
