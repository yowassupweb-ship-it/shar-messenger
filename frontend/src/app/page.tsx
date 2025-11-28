'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Languages, Search, TrendingUp, ShoppingBag, Tag, Settings } from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const tools: Tool[] = [
  {
    id: 'feed-editor',
    name: 'Редактор фидов',
    description: 'Заливка, редактирование и просмотр фидов в таблице и карточках',
    href: '/feed-editor',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-blue-500'
  },
  {
    id: 'transliterator',
    name: 'Транслитератор',
    description: 'Правильная транслитерация как на сайте',
    href: '/transliterator',
    icon: <Languages className="w-6 h-6" />,
    color: 'bg-green-500'
  },
  {
    id: 'competitor-parser',
    name: 'Парсер Я.Директ',
    description: 'Анализ и извлечение данных из рекламы конкурентов',
    href: '/direct-parser',
    icon: <Search className="w-6 h-6" />,
    color: 'bg-orange-500'
  },
  {
    id: 'slovolov',
    name: 'Словолов',
    description: 'Подбор поисковых слов и ключевых фраз для рекламных кампаний',
    href: '/slovolov',
    icon: <TrendingUp className="w-6 h-6" />,
    color: 'bg-pink-500'
  },
  {
    id: 'competitor-spy',
    name: 'Товары конкурентов',
    description: 'Парсинг и анализ ассортимента конкурентов по датам',
    href: '/competitors/timeline',
    icon: <ShoppingBag className="w-6 h-6" />,
    color: 'bg-indigo-500'
  },
  {
    id: 'utm-creator',
    name: 'Генератор UTM',
    description: 'Создание и отслеживание UTM меток с помощью Я.Метрики',
    href: '/utm-generator',
    icon: <Tag className="w-6 h-6" />,
    color: 'bg-purple-500'
  }
];

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const username = localStorage.getItem('username') || '';
    const userRole = localStorage.getItem('userRole') || '';
    
    // Обязательная авторизация - редирект если не авторизован
    if (!isAuthenticated || !username) {
      router.push('/login');
      return;
    }
    
    console.log('Username from localStorage:', username);
    console.log('User role from localStorage:', userRole);
    console.log('Is authenticated:', isAuthenticated);
    setCurrentUser(username);
    setIsAdmin(userRole === 'admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header with User Info */}
      <div className="bg-[var(--card)] border-b border-[var(--border)]">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-[var(--foreground)]">
            <svg width="60" height="32" viewBox="0 0 908 477" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M20.0064 337.525L17.0495 284.777L81.503 322.477L60.4945 358.946L27.5926 339.699C25.1945 338.296 22.5868 337.592 20.0064 337.525ZM5.62559 264.146L9.92507 340.839C8.29918 342.093 6.8906 343.685 5.80796 345.58C4.99308 347.003 4.4149 348.477 4.07342 349.944C3.71643 351.465 3.59225 353.041 3.68538 354.622L8.47768 434.404C8.80364 438.764 10.7982 442.593 13.7744 445.27C16.8244 448.014 20.9105 449.583 25.3148 449.319L25.5476 449.303C26.5604 449.225 27.5382 449.056 28.4618 448.808C29.5211 448.525 30.5261 448.136 31.4574 447.664L101.86 412.103C105.791 410.118 108.561 406.694 109.865 402.755C110.528 400.758 110.808 398.631 110.664 396.5V396.504L166.589 370.429C167.485 370.331 168.378 370.071 169.231 369.643L239.703 334.341C256.711 326.954 272.334 316.871 286.028 304.566C299.644 292.333 311.339 277.929 320.579 261.843C320.808 261.505 321.009 261.147 321.184 260.769C344.653 219.237 349.391 172.008 338.056 129.151C326.718 86.2736 299.291 47.7602 258.457 23.6858C258.116 23.446 257.751 23.2337 257.375 23.0529C216.378 -0.7227 169.759 -5.52263 127.455 5.96025C84.9527 17.4982 46.7889 45.4644 23.0486 87.1188C13.7512 103.433 7.18551 121.068 3.503 139.313C-0.179502 157.553 -0.990507 176.348 1.22132 194.982L5.62559 264.142V264.146ZM90.3775 327.666L153.997 364.878L106.706 386.932C106.501 386.696 106.283 386.464 106.062 386.236C104.917 385.068 103.614 384.094 102.201 383.339L69.3651 364.135L90.3736 327.666H90.3775ZM157.039 117.86C171.164 114.028 186.709 115.592 200.383 123.443L200.756 123.679C214.535 131.737 223.786 144.694 227.6 159.126C231.384 173.435 229.843 189.183 222.09 203.037L221.857 203.414C213.902 217.374 201.113 226.745 186.868 230.61C172.603 234.482 156.892 232.85 143.116 224.792C129.364 216.748 120.121 203.787 116.303 189.344C112.519 175.039 114.064 159.287 121.813 145.433L122.046 145.052C130 131.097 142.79 121.721 157.035 117.853L157.039 117.86Z" fill="currentColor"/>
              <path d="M401.297 354.16H330.182L355.131 241.957H418.102C428.734 241.957 436.859 244.73 442.456 250.284C448.06 255.832 450.858 262.37 450.858 269.878C450.858 276.947 448.318 283.334 443.223 289.058C438.129 294.776 432.194 297.917 425.4 298.481C430.606 299.937 434.596 302.744 437.368 306.894C440.14 311.045 441.523 315.642 441.523 320.691C441.523 324.612 440.789 328.455 439.313 332.212C437.844 335.97 435.635 339.53 432.691 342.894C429.746 346.258 425.565 348.98 420.127 351.052C414.695 353.124 408.416 354.167 401.291 354.167L401.297 354.16ZM406.048 283.34C408.992 283.34 411.116 282.612 412.412 281.15C413.716 279.694 414.364 277.898 414.364 275.766C414.364 274.199 413.828 272.881 412.75 271.812C411.678 270.75 410.176 270.212 408.251 270.212H383.467L380.239 283.334H406.041L406.048 283.34ZM397.731 325.898C400.556 325.898 402.879 325.17 404.691 323.707C406.498 322.252 407.404 320.343 407.404 317.989C407.404 316.081 406.815 314.54 405.624 313.36C404.433 312.18 402.879 311.596 400.953 311.596H373.967L370.738 325.891H397.725L397.731 325.898ZM491.785 356.18C477.865 356.18 467.087 352.619 459.452 345.498C451.817 338.376 447.993 329.321 447.993 318.33C447.993 305.543 452.638 294.442 461.914 285.019C471.189 275.596 482.906 270.888 497.045 270.888C510.965 270.888 521.742 274.448 529.377 281.57C537.012 288.691 540.836 297.747 540.836 308.737C540.836 321.517 536.198 332.626 526.916 342.048C517.64 351.465 505.93 356.18 491.785 356.18ZM492.976 329.432C497.951 329.432 501.974 327.557 505.024 323.799C508.08 320.042 509.602 315.524 509.602 310.258C509.602 306.219 508.391 303.111 505.957 300.921C503.522 298.73 500.161 297.642 495.86 297.642C490.879 297.642 486.863 299.517 483.806 303.275C480.749 307.032 479.221 311.544 479.221 316.816C479.221 320.855 480.438 323.97 482.873 326.153C485.308 328.344 488.675 329.432 492.976 329.432ZM625.237 354.16H588.584L579.924 327.412L571.779 335.826L567.704 354.16H537.151L555.312 272.907H585.865L579.58 300.16L603.682 272.907H641.526L605.038 309.917L625.23 354.16H625.237ZM687.864 356.18C677.113 356.18 669.194 352.645 664.1 345.583L655.274 385.117H624.728L649.842 272.907H680.395L678.357 281.484C684.92 274.422 692.33 270.888 700.594 270.888C709.982 270.888 717.425 273.832 722.916 279.72C728.401 285.609 731.147 293.937 731.147 304.704C731.147 310.534 730.234 316.403 728.427 322.285C726.628 328.166 723.981 333.707 720.534 338.855C717.087 344.009 712.522 348.193 706.872 351.386C701.216 354.58 694.877 356.18 687.864 356.18ZM682.433 329.432C687.302 329.432 691.378 327.662 694.652 324.134C697.927 320.612 699.575 316.252 699.575 311.098C699.575 307.17 698.238 303.943 695.585 301.425C692.932 298.907 689.73 297.642 685.992 297.642C681.46 297.642 677.338 299.491 673.6 303.189L668.85 323.878C672.244 327.583 676.769 329.432 682.426 329.432H682.433ZM725.033 384.947L734.706 359.209C736.631 359.989 739.516 360.389 743.36 360.389C747.435 360.389 750.293 359.38 751.683 357.189L753.376 354.501L739.794 272.907H771.193L776.288 319.34L802.593 272.907H835.687L779.51 364.258C774.29 372.75 768.812 378.73 763.049 382.088C757.287 385.445 750.148 387.13 741.659 387.13C735.096 387.13 729.552 386.403 725.027 384.947H725.033ZM908 272.907L902.059 299.15H866.074L854.026 354.16H823.473L841.462 272.907H907.993H908Z" fill="currentColor"/>
              <path d="M187.869 476.993C174.597 476.993 164.048 473.269 156.208 465.822C148.368 458.382 144.455 448.869 144.455 437.291C144.455 423.233 149.264 411.358 158.87 401.665C168.476 391.98 180.323 387.13 194.391 387.13C203.314 387.13 210.846 388.795 216.961 392.09C223.068 395.386 227.684 399.655 230.774 404.85L207.776 423.102C204.799 417.907 200.224 415.309 194.049 415.309C188.671 415.309 184.256 417.181 180.838 420.891C177.42 424.601 175.687 429.367 175.687 435.157C175.687 439.177 177.186 442.466 180.149 444.994C183.112 447.522 186.725 448.807 190.959 448.807C196.337 448.807 200.973 446.5 204.859 441.899L221.335 462.983C218.017 466.651 213.429 469.912 207.609 472.731C201.782 475.556 195.193 476.986 187.875 476.986L187.869 476.993ZM288.45 474.865H224.439L242.628 389.265H297.541C306.009 389.265 312.652 391.137 317.448 394.847C322.238 398.557 324.652 403.323 324.652 409.112C324.652 414.432 322.88 419.247 319.334 423.558C315.789 427.868 311.207 430.556 305.601 431.62C309.608 433.036 312.705 435.205 314.866 438.086C317.027 440.966 318.13 444.255 318.13 447.916C318.13 455.598 315.428 462.023 310.063 467.149C304.698 472.275 297.454 474.858 288.436 474.858L288.45 474.865ZM260.308 451.294H283.48C284.737 451.294 285.807 450.873 286.657 450.051C287.5 449.236 287.941 448.165 287.941 446.859C287.941 445.913 287.6 445.084 286.911 444.379C286.222 443.668 285.339 443.315 284.336 443.315H262.027L260.308 451.287V451.294ZM267.004 419.924H288.115C289.373 419.924 290.443 419.496 291.286 418.68C292.129 417.865 292.577 416.912 292.577 415.841C292.577 413.831 291.52 412.829 289.487 412.829H268.382L267.01 419.917L267.004 419.924ZM373.277 476.993C359.551 476.993 348.567 473.567 340.326 466.714C332.091 459.861 327.97 450.286 327.97 438.003C327.97 424.062 332.653 412.083 341.958 402.114C351.263 392.153 363.036 387.137 377.224 387.137C388.208 387.137 397.433 390.55 404.858 397.327C412.276 404.104 416.016 413.72 416.016 426.127C416.016 431.917 415.387 437.174 414.123 441.906H358.527V442.079C358.527 442.756 359.089 443.923 360.16 445.443C361.23 446.963 363.19 448.572 365.993 450.23C368.796 451.881 371.966 452.71 375.518 452.71C383.525 452.71 389.533 451.294 393.533 448.462L402.971 469.2C394.964 474.395 385.071 477 373.284 477L373.277 476.993ZM361.437 421.699H388.723V421.167C388.723 419.281 387.646 417.161 385.552 414.874C383.452 412.587 380.261 411.42 376.027 411.42C372.368 411.42 369.19 412.546 366.508 414.791C363.819 417.036 362.133 419.337 361.444 421.699H361.437ZM462.018 474.865H431.134L443.315 416.912H421.18L427.187 389.265H502.001L495.994 416.912H474.2L462.012 474.865H462.018ZM541.649 387.137C552.519 387.137 560.526 390.861 565.677 398.301L567.563 389.265H598.455L580.092 474.865H549.201L551.261 465.822C544.625 473.269 537.133 476.993 528.785 476.993C519.286 476.993 511.747 473.87 506.215 467.688C500.683 461.498 497.893 452.711 497.893 441.367C497.893 435.226 498.823 429.029 500.636 422.846C502.449 416.656 505.145 410.805 508.617 405.389C512.088 399.973 516.717 395.552 522.43 392.187C528.143 388.823 534.558 387.137 541.649 387.137ZM547.141 415.316C542.217 415.316 538.083 417.188 534.785 420.898C531.481 424.601 529.808 429.195 529.808 434.632C529.808 438.77 531.173 442.182 533.842 444.821C536.511 447.46 539.762 448.807 543.542 448.807C548.117 448.807 552.291 446.859 556.064 442.956L560.867 421.16C557.435 417.264 552.86 415.316 547.141 415.316Z" fill="currentColor"/>
            </svg>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-[var(--button)] text-[#1b1b2b] rounded-lg hover:opacity-90 transition-all font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Админ-панель
              </Link>
            )}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {mounted && currentUser ? currentUser.charAt(0).toUpperCase() : ''}
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-[var(--foreground)]">
                    {mounted ? currentUser : 'Загрузка...'}
                  </div>
                  {mounted && isAdmin && (
                    <div className="text-xs text-[var(--button)] font-medium">Администратор</div>
                  )}
                </div>
                <svg className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50">
                  <button
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      localStorage.removeItem('username');
                      localStorage.removeItem('userSession');
                      localStorage.removeItem('isAuthenticated');
                      localStorage.removeItem('userRole');
                      window.location.href = '/login';
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--background)] flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
            Доступные инструменты
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href}>
              <div className="group relative bg-[#252538] border border-[var(--border)] rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                <div className="flex items-start space-x-4 mb-4">
                  <div className={`p-3 rounded-lg text-white group-hover:scale-110 transition-transform duration-300 ${tool.color}`}>
                    {tool.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2 group-hover:text-[var(--primary)] transition-colors duration-300">
                      {tool.name}
                    </h3>
                    <p className="text-[var(--muted)] text-sm">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
