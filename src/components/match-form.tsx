
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
import type { CupMatch } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "./ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";

const formSchema = z.object({
  team1Id: z.string({ required_error: "Please select team 1." }),
  team2Id: z.string({ required_error: "Please select team 2." }),
  date: z.date({ required_error: "Please select a date." }),
}).refine(data => data.team1Id !== data.team2Id, {
    message: "Teams must be different.",
    path: ["team2Id"],
});

type MatchFormValues = z.infer<typeof formSchema>;

interface MatchFormProps {
  match?: CupMatch | null;
  onSave?: () => void;
}

export function MatchForm({ match, onSave }: MatchFormProps) {
  const { toast } = useToast();
  const form = useForm<MatchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      team1Id: match?.team1?.id || "",
      team2Id: match?.team2?.id || "",
      date: new Date(),
    },
  });

  const teamOptions = teams.map(team => ({
    value: team.id,
    label: team.name
  }));

  const onSubmit = (data: MatchFormValues) => {
    console.log("Saving match data:", data);

    toast({
      title: `Match ${match ? 'updated' : 'added'}!`,
      description: `The match has been successfully saved.`,
    });

    onSave?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="team1Id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Home Team</FormLabel>
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
        <FormField
          control={form.control}
          name="team2Id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Away Team</FormLabel>
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
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Match Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0,0,0,0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="submit">{match ? "Save Changes" : "Create Match"}</Button>
        </div>
      </form>
    </Form>
  );
}
