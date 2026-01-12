<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "$lib/components/ui/card";
</script>

<section class="container py-8 md:py-12 lg:py-24">
	<div class="mx-auto grid w-full max-w-[58rem] gap-6">
		<Card>
			<CardHeader>
				<CardTitle>Free</CardTitle>
				<CardDescription>For individuals.</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="text-4xl font-bold">$0</div>
			</CardContent>
			<CardFooter>
				<Button class="w-full">Get Started</Button>
			</CardFooter>
		</Card>
		<Card>
			<CardHeader>
				<CardTitle>Pro</CardTitle>
				<CardDescription>For teams.</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="text-4xl font-bold">$19/mo</div>
			</CardContent>
			<CardFooter>
				<Button class="w-full">Subscribe</Button>
			</CardFooter>
		</Card>
	</div>
</section>
