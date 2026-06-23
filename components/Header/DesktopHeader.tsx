'use client'

import React, { useRef, useState } from "react";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import MenuList from "@mui/material/MenuList";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PhoneIcon from "@mui/icons-material/Phone";

import Title from "@/components/Header/Title";
import { NavigationItem } from "@/components/Header";

// Render dropdowns above the sticky AppBar (zIndex.appBar === 1100).
const MENU_ZINDEX = 1300;

// Open on hover, with a small delay before closing so the pointer can travel
// across a sub-pixel gap between trigger and menu without flicker.
function useHoverMenu() {
	const [open, setOpen] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const enter = () => {
		if (timer.current) clearTimeout(timer.current);
		setOpen(true);
	};
	const leave = () => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => setOpen(false), 120);
	};

	return { open, enter, leave };
}

/**
 * A navigation node that may contain children. At the top level it renders as a
 * bar button with a downward caret; nested inside a dropdown it renders as a
 * menu item with a rightward caret that opens a flyout submenu. Leaf nodes are
 * plain anchor links. Recurses to arbitrary depth.
 */
const NavNode = ({ item, top = false }: { item: NavigationItem; top?: boolean }) => {
	const hasChildren = !!item.children?.length;
	const anchorRef = useRef<HTMLElement | null>(null);
	const { open, enter, leave } = useHoverMenu();

	if (!hasChildren) {
		return top ? (
			<Button component="a" href={item.path} sx={{ my: 2, color: 'common.white' }}>
				{item.label}
			</Button>
		) : (
			<MenuItem component="a" href={item.path}>
				<ListItemText>{item.label}</ListItemText>
			</MenuItem>
		);
	}

	const trigger = top ? (
		<Button
			ref={anchorRef as React.RefObject<HTMLButtonElement>}
			endIcon={<KeyboardArrowDownIcon />}
			sx={{ my: 2, color: 'common.white' }}
		>
			{item.label}
		</Button>
	) : (
		<MenuItem ref={anchorRef as React.RefObject<HTMLLIElement>} sx={{ pr: 1 }}>
			<ListItemText>{item.label}</ListItemText>
			<KeyboardArrowRightIcon fontSize="small" sx={{ ml: 2 }} />
		</MenuItem>
	);

	return (
		<Box onMouseEnter={enter} onMouseLeave={leave} sx={{ display: top ? 'inline-flex' : 'block' }}>
			{trigger}
			<Popper
				open={open}
				anchorEl={anchorRef.current}
				placement={top ? 'bottom-start' : 'right-start'}
				disablePortal
				sx={{ zIndex: MENU_ZINDEX }}
			>
				<Paper elevation={3} sx={{ minWidth: 220 }}>
					<MenuList dense>
						{item.children!.map((child) => (
							<NavNode key={child.label + (child.path ?? '')} item={child} />
						))}
					</MenuList>
				</Paper>
			</Popper>
		</Box>
	);
};

// Partner logos shown at the top-right of the header.
const partners = [
	{ href: 'https://path-cc.io', src: '/images/logos/Logo_Round_Med.png', alt: 'PATh' },
	{ href: 'https://pelicanplatform.org', src: '/images/logos/PelicanPlatformLogo_Icon.png', alt: 'Pelican Platform' },
	{ href: 'https://iris-hep.org/', src: '/images/logos/IRIS_HEP.png', alt: 'IRIS-HEP' },
];

const DesktopHeader = ({ pages }: { pages: NavigationItem[] }) => {
	return (
		<Toolbar disableGutters>
			<Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
				<Box sx={{ flex: '0 0 auto' }}>
					<Title />
				</Box>
				<Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
					{pages.map((page) => (
						<NavNode key={page.label} item={page} top />
					))}
				</Box>
				<Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
					<Tooltip title="Apply for Account">
						<IconButton component="a" href="https://portal.osg-htc.org/application" sx={{ color: 'common.white' }}>
							<PersonAddAlt1Icon />
						</IconButton>
					</Tooltip>
					<Tooltip title="Contact Us">
						<IconButton component="a" href="/contact" sx={{ color: 'common.white' }}>
							<PhoneIcon />
						</IconButton>
					</Tooltip>
					{partners.map((p) => (
						<Box key={p.href} component="a" href={p.href} target="_blank" rel="noopener" sx={{ display: 'inline-flex', ml: 0.5 }}>
							<Box component="img" src={p.src} alt={p.alt} sx={{ height: 40 }} />
						</Box>
					))}
				</Box>
			</Box>
		</Toolbar>
	);
};

export default DesktopHeader;
