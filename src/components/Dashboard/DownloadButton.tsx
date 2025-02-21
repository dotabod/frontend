import { Button } from 'antd'

function JustButton({
  url,
  data,
  user,
  extension = 'cfg',
  onClick = undefined,
}) {
  return (
    <div>
      <a
        href={url}
        download={`gamestate_integration_dotabod-${user.name}.${extension}`}
        onClick={onClick}
        className="ml-4 block w-48"
      >
        {data?.beta_tester ? (
          <div>
            <Button type="primary">Download beta config file</Button>
            <p className="text-xs text-gray-500">
              To opt out of the beta type !beta in your chat
            </p>
          </div>
        ) : (
          <Button>Download config file</Button>
        )}
      </a>
    </div>
  )
}

function DownloadButton({ url, data, user }) {
  return <JustButton url={url} data={data} user={user} />
}

export default DownloadButton
