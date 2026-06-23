import React, { CSSProperties } from "react";

const Icon = ({ size = "44px" }: { size?: CSSProperties['height'] }) => {
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src="/logos/osg.svg"
			alt="OSG logo"
			style={{ height: size, width: "auto" }}
		/>
	);
};

export default Icon;
