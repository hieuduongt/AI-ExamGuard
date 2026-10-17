import { FeatureHighlights } from './components/feature-highlights';
import { HeroSection } from './components/hero-section';
import { HomeHeader } from './components/home-header';
import { PrivacyBanner } from './components/privacy-banner';
export function HomeScreen() {
    return (<main className="min-h-screen overflow-hidden bg-background text-foreground">
      <HomeHeader />

      <HeroSection />

      <FeatureHighlights />

      <PrivacyBanner />
    </main>);
}
