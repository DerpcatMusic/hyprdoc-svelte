<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "$lib/components/ui/card";
</script>

<section class="container py-8 md:py-12 lg:py-24">
	<div class="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
		<Card>
			<CardHeader>
				<CardTitle>Feature 1</CardTitle>
				<CardDescription>Description for feature 1.</CardDescription>
			</CardHeader>
			<CardContent>
				<p>More details about feature 1.</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>Feature 2</CardTitle>
				<CardDescription>Description for feature 2.</CardDescription>
			</CardHeader>
			<CardContent>
				<p>More details about feature 2.</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>Feature 3</CardTitle>
				<CardDescription>Description for feature 3.</CardDescription>
			</CardHeader>
			<CardContent>
				<p>More details about feature 3.</p>
			</CardContent>
		</Card>
	</div>
</section>
