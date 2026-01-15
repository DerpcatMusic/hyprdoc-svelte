import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Expire canceled subscriptions past their end date
crons.daily(
	"expire subscriptions",
	{ hourUTC: 1, minuteUTC: 0 },
	internal.polar.mutations.expireSubscriptions,
);

export default crons;
