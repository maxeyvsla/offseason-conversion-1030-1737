import UpgradeForm from '@/components/UpgradeForm';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:px-12 md:pb-12 md:pt-8 lg:pt-8 lg:px-16 lg:pb-16">
      <div className="w-full max-w-[800px] mx-auto">
          <Image
            src="/images/virtual-snow-logo.png"
            alt="Virtual Snow Logo"
            width={500}
            height={100}
            className="mx-auto p-6 pb-10"
            priority
          />
        <UpgradeForm />
      </div>
    </main>
  );
}