import { LiveIcon } from "./LiveIcon";
import DiscordSvg from "src/images/logos/discord.svg";
import Image from "next/image";
import { Button } from "antd";
import { Container } from "src/components/Container";
import { PhoneFrame } from "@/components/Homepage/PhoneFrame";
import { useSession } from "next-auth/react";
import dotaLogo from "src/images/logos/dota.svg";
import { BackgroundIllustration } from "@/components/Homepage/BackgroundIllustration";
import Link from "next/link";
import { CursorArrowRaysIcon } from "@heroicons/react/24/outline";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import TwitchSvg from "src/images/logos/twitch.svg";

const featuredUsers = [
	{
		name: "Arteezy",
		supporter: false,
		image: "/images/hero/arteezy.png",
	},
	{
		name: "Gorgc",
		supporter: false,
		image: "/images/hero/gorgc.jpeg",
	},
	{
		name: "qojqva",
		supporter: false,
		image: "/images/hero/qojqva.jpeg",
	},
	{
		name: "Grubby",
		supporter: false,
		image: "/images/hero/grubby.png",
	},
	{
		name: "watsondoto",
		supporter: false,
		image: "/images/hero/watsondoto.jpg",
	},
	{
		name: "admiralbulldog",
		supporter: false,
		image: "/images/hero/admiralbulldog.jpeg",
	},
	{
		name: "TpaBoMaH",
		image: "/images/hero/tpabomah.png",
		supporter: false,
	},
	{
		name: "XcaliburYe",
		supporter: false,
		image: "/images/hero/xcaliburye.png",
	},
	{
		name: "Cr1tdota",
		supporter: false,
		image: "/images/hero/crit.jpeg",
	},
	{
		name: "canceldota",
		supporter: false,
		image: "/images/hero/cancel.png",
	},
	{
		name: "GunnarDotA2",
		supporter: false,
		image: "/images/hero/gunnar.png",
	},
	{
		name: "You?",
		supporter: false,
		image: "/images/hero/default.png",
	},
];

const grouped = featuredUsers.reduce((result, item) => {
	const key = item.supporter ? "supporters" : "nonSupporters";
	if (!result[key]) {
		result[key] = [];
	}
	result[key].push(item);
	return result;
}, {}) as {
	supporters: typeof featuredUsers;
	nonSupporters: typeof featuredUsers;
};

const TwitchUser = ({
	image,
	last,
	name,
	onClick,
	session,
	supporter,
}: {
	image: string;
	last: boolean;
	name: string;
	onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
	session: any;
	supporter: boolean;
}) => {
	const userName = last ? session?.data?.user?.name || name : name;
	const imagesrc = last ? session?.data?.user?.image || image : image;

	return (
		<li className="relative">
			<a
				className="flex flex-col items-center space-y-1 rounded-lg px-4 py-4 transition-shadow hover:shadow-lg"
				rel="noreferrer"
				href={userName === "You?" ? "#" : `https://twitch.tv/${userName}`}
				target="_blank"
			>
				<Image
					src={imagesrc}
					width={50}
					height={50}
					alt={userName}
					unoptimized
					className="rounded-lg shadow-lg"
				/>
				<span className="text-xs text-gray-300">{userName}</span>
			</a>
		</li>
	);
};

export function Hero() {
	const session = useSession();
	const name = session.data?.user?.name || "streamers";
	const { nonSupporters } = grouped;
	// get users from api/featured-users
	const { data: users, isLoading } = useSWR<{
		randomLive: { name: string; image: string }[];
		topLive: { name: string; image: string }[];
	}>("/api/featured-users", fetcher);

	return (
		<div className="overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
			<Container>
				<div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-20">
					<div className="relative z-10 mx-auto max-w-2xl lg:col-span-7 lg:max-w-none lg:pt-6 xl:col-span-6">
						<h1 className="flex items-center space-x-2 text-4xl font-medium tracking-tight text-gray-200">
							<span>Welcome, {name}</span>
							<Image
								src="/images/emotes/peepoclap.webp"
								width={38}
								height={38}
								alt="peepoclap"
							/>
						</h1>
						<p className="mt-6 text-lg text-gray-300">
							Unlock the Ultimate Dota 2 Streaming Experience with Dotabod!
							Boost your stream&apos;s engagement, showcase real-time stats, and
							delight your audience with our all-in-one streaming toolkit.
							Elevate your game and become the streamer you were meant to be!
						</p>
						<div className="mt-8 flex flex-wrap gap-x-6 gap-y-4">
							<Link href="/dashboard">
								<Button type="primary">
									<div className="flex items-center space-x-2">
										<CursorArrowRaysIcon className="flex h-4 w-4" />
										{session?.status === "authenticated" ? (
											<span>Go to dashboard</span>
										) : (
											<span>Get started</span>
										)}
									</div>
								</Button>
							</Link>
							<Button
								href="https://discord.dotabod.com"
								target="_blank"
								className="space-x-2"
							>
								<div className="flex items-center space-x-2">
									<Image alt="discord" src={DiscordSvg} className="h-4 w-4" />
									<span>Join Discord</span>
								</div>
							</Button>
						</div>
					</div>
					<div className="relative lg:col-span-5 lg:row-span-2 xl:col-span-6">
						<BackgroundIllustration className="absolute left-1/2 top-4 h-[1026px] w-[1026px] -translate-x-1/3 stroke-gray-300/70 [mask-image:linear-gradient(to_bottom,white_20%,transparent_75%)] sm:top-16 sm:-translate-x-1/2 lg:-top-16 lg:ml-12 xl:-top-14 xl:ml-0" />
						<div className="-mx-4 h-[448px] px-9 [mask-image:linear-gradient(to_bottom,white_60%,transparent)] sm:mx-0 lg:absolute lg:-inset-x-10 lg:-top-10 lg:-bottom-20 lg:h-auto lg:px-0 lg:pt-10 xl:-bottom-32">
							<PhoneFrame className="mx-auto max-w-[366px]" priority>
								<Image
									src={dotaLogo}
									width={240}
									height={240}
									alt="dota logo"
									className="pointer-events-none absolute inset-0 h-full w-full"
								/>
							</PhoneFrame>
						</div>
					</div>
				</div>
				{isLoading ? (
					<>
						<div className="relative lg:col-span-7 xl:col-span-6">
							<div className="flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left">
								<Image
									src={TwitchSvg}
									width={18}
									height={18}
									alt="twitch logo"
								/>
								<span>Featured in over 15,000 Twitch streamers</span>
							</div>
						</div>
						<ul className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start">
							{nonSupporters?.map(({ name, image, supporter }) => {
								const isLast = name === "You?";
								return (
									<TwitchUser
										key={name}
										supporter={supporter}
										last={isLast}
										session={session}
										name={name}
										onClick={(e) => {
											if (name === "You?") {
												e.preventDefault();
											}
										}}
										image={image}
									/>
								);
							})}
						</ul>
					</>
				) : (
					<>
						<div className="relative lg:col-span-7 xl:col-span-6">
							<div className="relative lg:col-span-7 xl:col-span-6">
								<div className="flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left">
									<LiveIcon />
									<span>Top streamers using Dotabod:</span>
								</div>
							</div>
							<ul className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start">
								{users?.topLive.map(({ name, image }) => (
									<TwitchUser
										key={name}
										supporter={false}
										last={false}
										session={session}
										name={name}
										image={image}
									/>
								))}
							</ul>
							<div className="relative lg:col-span-7 xl:col-span-6">
								<div className="flex items-center space-x-2 text-center text-sm font-semibold text-gray-300 lg:text-left">
									<LiveIcon />
									<span>Random Dotabod streamers:</span>
								</div>
							</div>
							<ul className="mx-auto flex max-w-xl flex-wrap justify-center lg:mx-0 lg:justify-start">
								{users?.randomLive.map(({ name, image }) => (
									<TwitchUser
										key={name}
										supporter={false}
										last={false}
										session={session}
										name={name}
										image={image}
									/>
								))}
							</ul>
						</div>
					</>
				)}
			</Container>
		</div>
	);
}
