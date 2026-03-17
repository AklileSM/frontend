import { Link } from 'react-router-dom';
// import DropdownMessage from './DropdownMessage';
// import DropdownNotification from './DropdownNotification';
// import DropdownUser from './DropdownUser';
// import LogoIcon from '../../images/logo/logo-icon.svg';
import DarkModeSwitcher from './DarkModeSwitcher';

const HomeHeader = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  return (
    <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          {/* <!-- Hamburger Toggle BTN --> */}

          {/* <!-- Hamburger Toggle BTN --> */}

          <Link className="block flex-shrink-0 lg:hidden" to="/">
            
          </Link>
        </div>

        <div className="hidden sm:block">
          {/* Light mode image */}
          <img 
            className="w-1/12 dark:hidden" 
            src="Logo/LogoforWhite.png" 
            alt="Logo for light mode" 
          />
          {/* Dark mode image */}
          <img 
            className="w-1/12 hidden dark:block" 
            src="Logo/LogoforDark.png" 
            alt="Logo for dark mode" 
          />
        </div>


        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <button
              className="mr-5 inline-flex items-center justify-center rounded-md bg-primary py-3 px-10 text-center font-medium text-white hover:scale-105 lg:px-8 xl:px-10"
            >
              Login
            </button>

            {/* <!-- Dark Mode Toggler --> */}
            <DarkModeSwitcher />
            {/* <!-- Dark Mode Toggler --> */}

            {/* <!-- Notification Menu Area --> */}
            {/* <DropdownNotification /> */}
            {/* <!-- Notification Menu Area --> */}

            {/* <!-- Chat Notification Area --> */}
            {/* <DropdownMessage /> */}
            {/* <!-- Chat Notification Area --> */}
          </ul>

          {/* <!-- User Area --> */}
          {/* <DropdownUser /> */}
          {/* <!-- User Area --> */}
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
