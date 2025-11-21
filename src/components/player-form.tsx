
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { teams } from "@/lib/data";
import type { Player } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "./ui/combobox";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Player name must be at least 2 characters.",
  }),
  teamId: z.string({ required_error: "Please select a team." }),
});

type PlayerFormValues = z.infer<typeof formSchema>;

interface PlayerFormProps {
  player?: Player | null;
  onSave?: () => void;
}

export function PlayerForm({ player, onSave }: PlayerFormProps) {
  const { toast } = useToast();
  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: player?.name || "",
      teamId: player?.team.id || "",
    },
  });

  const teamOptions = teams.map(team => ({
    value: team.id,
    label: team.name
  }));

  const onSubmit = (data: PlayerFormValues) => {
    // In a real app, you would handle saving the data to a database here.
    // For now, we'll just log it and show a success message.
    console.log("Saving player data:", data);

    toast({
      title: `Player ${player ? 'updated' : 'added'}!`,
      description: `${data.name} has been successfully saved.`,
    });

    onSave?.(); // Close the dialog
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Player Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Andi 'The Ace'" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="teamId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Team</FormLabel>
              <FormControl>
                <Combobox
                  options={teamOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a team"
                  searchPlaceholder="Search team..."
                  emptyPlaceholder="No team found."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="submit">{player ? "Save Changes" : "Create Player"}</Button>
        </div>
      </form>
    </Form>
  );
}
