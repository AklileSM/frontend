import { ReactNode, useEffect, useState } from 'react';

interface SidebarLinkGroupProps {
  children: (handleClick: () => void, open: boolean) => ReactNode;
  activeCondition: boolean;
  /** When false (e.g. sidebar collapsed), the group closes so it does not reopen expanded. */
  expanded?: boolean;
}

const SidebarLinkGroup = ({
  children,
  activeCondition,
  expanded = true,
}: SidebarLinkGroupProps) => {
  const [open, setOpen] = useState<boolean>(activeCondition);

  useEffect(() => {
    if (!expanded) setOpen(false);
  }, [expanded]);

  const handleClick = () => {
    setOpen(!open);
  };

  return <li>{children(handleClick, open)}</li>;
};

export default SidebarLinkGroup;
