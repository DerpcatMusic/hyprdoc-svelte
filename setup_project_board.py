import os
import json
import subprocess
import sys
from time import sleep

# --- CONFIGURATION ---
REPO_OWNER = "DerpcatMusic"
REPO_NAME = "hyprdoc-svelte"
PROJECT_TITLE = "HyprDoc Roadmap Board"
DESCRIPTION = "Master roadmap automatically generated from GitHub Issues."

# --- COLORS for Fields ---
COLORS = {
    "critical": "RED",
    "high": "ORANGE",
    "medium": "YELLOW",
    "low": "GREEN",
    "uncategorized": "GRAY",
}

# --- FIELD DEFINITIONS ---
# Map labels to Project Field Options
FIELD_MAPPINGS = {
    "Horizon": {
        "options": [
            "horizon-1",
            "horizon-2",
            "horizon-3",
            "horizon-4",
            "horizon-uncategorized",
        ],
        "colors": ["RED", "ORANGE", "YELLOW", "GREEN", "GRAY"],
    },
    "Priority": {
        "options": ["critical", "high", "medium", "low"],
        "colors": ["RED", "ORANGE", "YELLOW", "GREEN"],
    },
    "Size": {
        "options": ["epic", "large", "medium", "small"],
        "colors": ["PURPLE", "BLUE", "GREEN", "GRAY"],
    },
    "Area": {
        # Areas are dynamically extracted, but we define some common ones for color mapping if needed
        # For now, we'll create options dynamically or a fixed set if preferred.
        # Let's use a fixed set based on observed labels to ensure order.
        "options": [
            "editor",
            "dashboard",
            "integrations",
            "living-contracts",
            "signing",
            "onboarding",
            "ui-ux",
            "api",
            "general",
        ],
        "colors": [
            "BLUE",
            "BLUE",
            "PURPLE",
            "GREEN",
            "YELLOW",
            "ORANGE",
            "PINK",
            "GRAY",
            "GRAY",
        ],
    },
}


def run_gh_query(query, variables=None):
    """Executes a GraphQL query using the gh CLI."""
    cmd = ["gh", "api", "graphql", "-f", f"query={query}"]
    if variables:
        for k, v in variables.items():
            if isinstance(v, (dict, list)):
                cmd.extend(
                    ["-F", f"{k}={json.dumps(v)}"]
                )  # Use -F for JSON objects/lists might need specific handling, but gh supports direct JSON string for variables often better via -f with serialized json if complex.
                # Actually, for complex types like lists, it's safer to pass as JSON string
                # cmd.extend(["-f", f"{k}={json.dumps(v)}"])
                pass
            else:
                cmd.extend(["-f", f"{k}={v}"])

    # For complex variables (lists/objects), we might need to write to a temp file or use stdin
    # But for this script, we construct the command carefully.
    # A better way for complex vars in gh cli is passing json via stdin or -f key='json_string'

    # Let's use stdin for variables to be safe with quoting
    json_vars = json.dumps(variables) if variables else "{}"

    # CLI command construction
    command_list = ["gh", "api", "graphql"]

    # We will pass the query as a field
    # and variables as a generic JSON input if possible, but gh api graphql expects individual -f
    # Let's stick to simple -f for scalars and careful construction for objects if needed.
    # Actually, the 'gh api' supports '--input -' for JSON body, but 'gh api graphql' is a specific helper.
    # Let's just use raw 'gh api graphql -f query=... -f variable=value'

    # For lists/objects, we need to pass them as stringified JSON in the variable
    final_args = command_list + ["-f", f"query={query}"]
    if variables:
        for k, v in variables.items():
            val = json.dumps(v) if isinstance(v, (list, dict)) else str(v)
            final_args.extend(["-f", f"{k}={val}"])

    result = subprocess.run(final_args, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running query: {result.stderr}")
        return None
    return json.loads(result.stdout)


def get_user_id(login):
    query = """
    query($login: String!) {
        user(login: $login) {
            id
        }
    }
    """
    data = run_gh_query(query, {"login": login})
    return data["data"]["user"]["id"] if data else None


def create_project(owner_id, title):
    query = """
    mutation($ownerId: ID!, $title: String!) {
        createProjectV2(input: { ownerId: $ownerId, title: $title }) {
            projectV2 {
                id
                url
                number
            }
        }
    }
    """
    data = run_gh_query(query, {"ownerId": owner_id, "title": title})
    return data["data"]["createProjectV2"]["projectV2"] if data else None


def create_field(project_id, name, options, option_colors):
    """Creates a Single Select field."""
    # Construct options input
    select_options = []
    for opt, color in zip(options, option_colors):
        select_options.append({"name": opt, "color": color})

    query = """
    mutation($projectId: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]) {
        createProjectV2Field(input: { 
            projectId: $projectId, 
            name: $name, 
            dataType: SINGLE_SELECT, 
            singleSelectOptions: $options 
        }) {
            projectV2Field {
                ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                        id
                        name
                    }
                }
            }
        }
    }
    """
    data = run_gh_query(
        query, {"projectId": project_id, "name": name, "options": select_options}
    )
    return data["data"]["createProjectV2Field"]["projectV2Field"] if data else None


def get_repo_issues(owner, repo):
    # Fetch all open issues with labels
    cmd = [
        "gh",
        "issue",
        "list",
        "--repo",
        f"{owner}/{repo}",
        "--limit",
        "100",
        "--json",
        "id,number,title,labels",
        "--state",
        "OPEN",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error fetching issues: {result.stderr}")
        return []
    return json.loads(result.stdout)


def add_item_to_project(project_id, content_id):
    query = """
    mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
            item {
                id
            }
        }
    }
    """
    data = run_gh_query(query, {"projectId": project_id, "contentId": content_id})
    return data["data"]["addProjectV2ItemById"]["item"]["id"] if data else None


def update_field_value(project_id, item_id, field_id, option_id):
    query = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
            projectId: $projectId,
            itemId: $itemId,
            fieldId: $fieldId,
            value: { singleSelectOptionId: $optionId }
        }) {
            projectV2Item {
                id
            }
        }
    }
    """
    run_gh_query(
        query,
        {
            "projectId": project_id,
            "itemId": item_id,
            "fieldId": field_id,
            "optionId": option_id,
        },
    )


def main():
    print(
        f"--- [START] Initializing Project Board Setup for {REPO_OWNER}/{REPO_NAME} ---"
    )

    # 1. Get User ID
    user_id = get_user_id(REPO_OWNER)
    if not user_id:
        print("Error: Failed to get User ID. Check authentication.")
        sys.exit(1)
    print(f"User ID found: {user_id}")

    # 2. Create Project
    print(f"Creating Project: {PROJECT_TITLE}...")
    project = create_project(user_id, PROJECT_TITLE)
    if not project:
        print("Error: Failed to create project. Ensure 'project' scope is enabled.")
        sys.exit(1)

    project_id = project["id"]
    print(f"Project Created: {project['url']} (ID: {project_id})")

    # 3. Create Fields and Store their Metadata
    field_metadata = {}  # { "Field Name": { "id": "...", "options": { "Option Name": "opt_id" } } }

    for field_name, config in FIELD_MAPPINGS.items():
        print(f"Creating Field: {field_name}...")
        field_data = create_field(
            project_id, field_name, config["options"], config["colors"]
        )

        if field_data:
            options_map = {opt["name"]: opt["id"] for opt in field_data["options"]}
            field_metadata[field_name] = {
                "id": field_data["id"],
                "options": options_map,
            }
            print(f"Field '{field_name}' created.")
        else:
            print(f"Warning: Failed to create field '{field_name}'.")

    # 4. Process Issues
    print("Fetching Issues...")
    issues = get_repo_issues(REPO_OWNER, REPO_NAME)
    print(f"Found {len(issues)} issues to process.")

    for issue in issues:
        print(f"Processing #{issue['number']}: {issue['title'][:30]}...", end=" ")

        # Add to project
        item_id = add_item_to_project(project_id, issue["id"])
        if not item_id:
            print("Error: Failed to add to project.")
            continue

        print("Added.", end=" ")

        # Parse Labels and Update Fields
        labels = [l["name"] for l in issue["labels"]]

        # Helper to extract value from labels
        def find_label_value(prefix, default=None):
            for l in labels:
                if l.startswith(prefix):
                    return l.replace(prefix, "").strip()
            return default

        # 1. Horizon
        # Look for "horizon-X"
        horizon_val = next(
            (l for l in labels if l.startswith("horizon-")), "horizon-uncategorized"
        )
        if horizon_val in field_metadata["Horizon"]["options"]:
            update_field_value(
                project_id,
                item_id,
                field_metadata["Horizon"]["id"],
                field_metadata["Horizon"]["options"][horizon_val],
            )

        # 2. Priority
        # Look for "priority: X"
        prio_val = find_label_value("priority: ")
        if prio_val and prio_val in field_metadata["Priority"]["options"]:
            update_field_value(
                project_id,
                item_id,
                field_metadata["Priority"]["id"],
                field_metadata["Priority"]["options"][prio_val],
            )

        # 3. Size
        # Look for "size: X"
        size_val = find_label_value("size: ")
        if size_val and size_val in field_metadata["Size"]["options"]:
            update_field_value(
                project_id,
                item_id,
                field_metadata["Size"]["id"],
                field_metadata["Size"]["options"][size_val],
            )

        # 4. Area
        # Look for "area: X"
        area_val = find_label_value("area: ")
        if area_val and area_val in field_metadata["Area"]["options"]:
            update_field_value(
                project_id,
                item_id,
                field_metadata["Area"]["id"],
                field_metadata["Area"]["options"][area_val],
            )

        print("Updated.")
        sleep(0.5)  # Avoid rate limits

    print("\nPROJECT BOARD SETUP COMPLETE!")
    print(f"View here: {project['url']}")


if __name__ == "__main__":
    main()
