"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/stores/user-store";
import { ACTIVITY_LEVELS, GENDERS } from "@/types/user";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const optionalNumberSchema = (min: number, max: number, msg: string) =>
    z
        .union([z.string(), z.number(), z.null(), z.undefined()])
        .transform((val) => (val === "" || val === 0 || val === null || val === undefined ? null : Number(val)))
        .pipe(z.number().min(min, msg).max(max, msg).nullable());

const schema = z.object({
    height: optionalNumberSchema(120, 230, "La taille doit être comprise entre 120 et 230 cm"),
    weight: optionalNumberSchema(35, 250, "Le poids doit être compris entre 35 et 250 kg"),
    age: optionalNumberSchema(10, 100, "L'âge doit être compris entre 10 et 100 ans"),
    gender: z.enum(GENDERS),
    activityLevel: z.enum(ACTIVITY_LEVELS),
});

type FormData = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

export default function ProfileForm() {
    const { height, weight, age, gender, activityLevel, updateUser } = useUserStore();

    const form = useForm<FormInput, undefined, FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            height: height || undefined,
            weight: weight || undefined,
            age: age || undefined,
            gender: gender,
            activityLevel: activityLevel,
        },
    });

    // Sync form with store on mount/update (handles hydration)
    useEffect(() => {
        form.reset({
            height: height || undefined,
            weight: weight || undefined,
            age: age || undefined,
            gender,
            activityLevel,
        });
    }, [height, weight, age, gender, activityLevel, form]);

    function onSubmit(data: FormData) {
        updateUser({
            height: data.height || null,
            weight: data.weight || null,
            age: data.age || null,
            gender: data.gender,
            activityLevel: data.activityLevel,
        });
        toast.success("Profil mis à jour");
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sexe</FormLabel>
                                <FormControl>
                                    <select
                                        {...field}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="unspecified">Non spécifié</option>
                                        <option value="male">Homme</option>
                                        <option value="female">Femme</option>
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Âge (ans)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ex: 30" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormDescription>Entre 10 et 100 ans.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Taille (cm)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ex: 175" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormDescription>Entre 120 et 230 cm.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Poids (kg)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ex: 70" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormDescription>Entre 35 et 250 kg.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="activityLevel"
                        render={({ field }) => (
                            <FormItem className="col-span-1 md:col-span-2">
                                <FormLabel>Niveau d&apos;activité</FormLabel>
                                <FormControl>
                                    <select
                                        {...field}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="sedentary">Sédentaire (Peu ou pas d&apos;exercice)</option>
                                        <option value="light">Léger (1-3 séances/semaine)</option>
                                        <option value="moderate">Modéré (3-5 séances/semaine)</option>
                                        <option value="active">Actif (Sport quotidien)</option>
                                        <option value="very_active">Très actif (Sport intense + travail physique)</option>
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit">Enregistrer le profil</Button>
                </div>
            </form>
        </Form>
    );
}
