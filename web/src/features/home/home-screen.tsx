/**
 * File này ghép nên toàn bộ trang chủ (địa chỉ "/") của AI ExamGuard.
 * Trang chủ chỉ để giới thiệu; nó không bật camera hay gửi dữ liệu gì.
 */
import { FeatureHighlights } from './components/feature-highlights';
import { HeroSection } from './components/hero-section';
import { HomeHeader } from './components/home-header';
import { PrivacyBanner } from './components/privacy-banner';

/**
 * Đây là gì: React component (một khối giao diện, như một viên gạch ghép nên màn hình)
 *   của trang chủ "/".
 * Mục tiêu: giới thiệu sản phẩm và có đường dẫn sang khu thí sinh và khu giám thị.
 * Chức năng: xếp lần lượt từ trên xuống: thanh tiêu đề, phần giới thiệu lớn, ba điểm nổi bật,
 *   và dải thông báo về quyền riêng tư.
 * Đầu ra: giao diện trang chủ hoàn chỉnh.
 * Dùng ở đâu: web/src/app/page.tsx (trang "/").
 * Liên kết với: HomeHeader, HeroSection, FeatureHighlights, PrivacyBanner
 *   (trong web/src/features/home/components/).
 */
export function HomeScreen() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <HomeHeader />

      <HeroSection />

      <FeatureHighlights />

      <PrivacyBanner />
    </main>
  );
}
