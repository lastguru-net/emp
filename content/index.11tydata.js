import siteconfig from "./_data/siteconfig.js";

export default {
	pagination: {
		size: siteconfig?.pagination?.postsPerPage ?? 10,
	},
};