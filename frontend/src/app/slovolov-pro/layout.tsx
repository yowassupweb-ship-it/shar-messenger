import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SLOVOLOV:PRO',
  description: 'Управление ключевыми словами и фильтрами',
};

export default function SlovolovProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}
