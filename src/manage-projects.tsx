import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";
import { clearInterval } from "timers";

enum Status {
  Running = "running",
  Stopped = "stopped",
  Paused = "paused",
  INTERNAL_STATUS_IS_LOADING = "INTERNAL_STATUS_IS_LOADING",
}

interface Project {
  approot: string;
  docroot: string;
  httpsurl: string;
  httpurl: string;
  mailpit_https_url: string;
  mailpit_url: string;
  mutagen_enabled: boolean;
  mutagen_status: string;
  name: string;
  nodejs_version: string;
  primary_url: string;
  router: string;
  router_disabled: boolean;
  shortroot: string;
  status: Status;
  status_desc: string;
  type: string;
}

interface StatusConfig {
  color: Color;
  actionIcon: Icon;
  actionTitle: string;
}

const statusConfigs: Record<Status, StatusConfig> = {
  [Status.Running]: {
    color: Color.Green,
    actionIcon: Icon.Stop,
    actionTitle: "Stop",
  },
  [Status.Stopped]: {
    color: Color.Red,
    actionIcon: Icon.Play,
    actionTitle: "Start",
  },
  [Status.Paused]: {
    color: Color.Blue,
    actionIcon: Icon.Play,
    actionTitle: "Resume",
  },
  [Status.INTERNAL_STATUS_IS_LOADING]: {
    color: Color.Orange,
    actionIcon: Icon.CircleProgress100,
    actionTitle: "Please wait...",
  },
};

const loadingStates = [
  Icon.CircleProgress25,
  Icon.CircleProgress50,
  Icon.CircleProgress75,
  Icon.CircleProgress100,
  Icon.CircleProgress75,
  Icon.CircleProgress50,
];

const ManageProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingState, setLoadingState] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refreshProjects = () => {
    exec("source ~/.zprofile && ddev list --json-output", { shell: "/bin/zsh" }, (error, stdout, stderr) => {
      if (error) return console.log("Error:", error);
      if (stderr) return console.log("Stderr:", stderr);

      setProjects(JSON.parse(stdout).raw);

      setIsLoading(false);
    });
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => setLoadingState((loadingState + 1) % loadingStates.length), 500);

    return () => {
      clearInterval(interval);
      // setLoadingState(0);
    };
  }, [isLoading]);

  /**
   * @param projectName
   * @param startOrStop Starts project if set to true, stops if set to false
   */
  const onStatusChange = (projectName: string, startOrStop: boolean = true) => {
    setIsLoading(true);

    exec(`source ~/.zprofile && ddev ${startOrStop ? "start" : "stop"} ${projectName}`, { shell: "/bin/zsh" }, () =>
      refreshProjects(),
    );
  };

  return (
    <List isShowingDetail={false} isLoading={isLoading}>
      {projects
        ? projects.map((project) => (
            <List.Item
              key={project.name}
              icon={{
                source: !isLoading ? Icon.CircleFilled : loadingStates[loadingState],
                tintColor: statusConfigs[project.status].color,
              }}
              title={project.name}
              subtitle={project.primary_url}
              accessories={[
                {
                  tag: {
                    value: isLoading ? "processing..." : project.status,
                    color: statusConfigs[isLoading ? Status.INTERNAL_STATUS_IS_LOADING : project.status].color,
                  },
                },
              ]}
              actions={
                <ActionPanel title={"Aaa"}>
                  {!isLoading && (
                    <>
                      <Action
                        icon={statusConfigs[project.status].actionIcon}
                        title={statusConfigs[project.status].actionTitle}
                        onAction={() => onStatusChange(project.name, project.status !== Status.Running)}
                      />
                      <Action.OpenInBrowser title={"Open in Browser"} url={project.primary_url} />
                      <Action.OpenInBrowser
                        icon={Icon.Envelope}
                        title={"Open Mailpit"}
                        url={project.mailpit_https_url}
                      />
                    </>
                  )}
                  <Action.ShowInFinder title={"Show in Finder"} path={project.approot} />
                </ActionPanel>
              }
            />
          ))
        : ""}
    </List>
  );
};

export default ManageProjects;
